import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserForgotPasswordRequestLimitExceededException } from '@modules/user/exceptions/user.forgot-password-request-limit-exceeded.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordMustNewException } from '@modules/user/exceptions/user.password-must-new.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type {
    IUser,
    IUserChangePassword,
    IUserForgotPasswordCreate,
    IUserResetPassword,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

@Injectable()
export class UserPasswordDomain {
    private readonly homeUrl: string;

    private readonly forgotPasswordReferencePrefix: string;
    private readonly forgotPasswordReferenceLength: number;
    private readonly forgotExpiredInMinutes: number;
    private readonly forgotTokenLength: number;
    private readonly forgotResendInMinutes: number;
    private readonly forgotLinkPattern: string;

    constructor(
        private readonly userPasswordRepository: UserPasswordRepository,
        private readonly userRepository: UserRepository,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly userUtil: UserUtil,
        private readonly helperHashService: HelperHashService,
        private readonly userLoginDomain: UserLoginDomain,
        private readonly userDomain: UserDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly deviceDomain: DeviceDomain
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        const forgotExpiredInMs = this.configService.get<number>(
            'forgotPassword.expiredInMs'
        )!;
        this.forgotExpiredInMinutes = forgotExpiredInMs / ms('1m');
        this.forgotTokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        const forgotResendInMs = this.configService.get<number>(
            'forgotPassword.resendInMs'
        )!;
        this.forgotResendInMinutes = forgotResendInMs / ms('1m');
        this.forgotLinkPattern = this.configService.get<string>(
            'forgotPassword.linkPattern'
        )!;
    }

    private async assertForgotPasswordAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'changePassword',
            'forgotAllowed'
        );
    }

    forgotPasswordCreateReference(): string {
        const random = this.helperStringService.random(
            this.forgotPasswordReferenceLength
        );

        return `${this.forgotPasswordReferencePrefix}-${random}`;
    }

    forgotPasswordCreateToken(): string {
        return this.helperStringService.random(this.forgotTokenLength);
    }

    forgotPasswordSetExpiredDate(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.forgotExpiredInMinutes })
        );
    }

    forgotPasswordCreate(): IUserForgotPasswordCreate {
        const token = this.forgotPasswordCreateToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(
            this.forgotLinkPattern,
            { homeUrl: this.homeUrl, token }
        );

        const reference = this.forgotPasswordCreateReference();
        const expiredAt = this.forgotPasswordSetExpiredDate();

        return {
            reference,
            expiredAt,
            token,
            hashedToken,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link,
        };
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userDomain.resetPasswordAttempt(userId);
    }

    async reachMaxPasswordAttempt(userId: string): Promise<void> {
        const revokeAllEvents = this.sessionDomain.prepareRevokeAllSelf(
            userId,
            true
        );
        const reachMaxEvents = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId,
                createdBy: userId,
                onError: true,
            }),
        ];
        const now = this.helperDateService.create();

        try {
            await this.databaseService.withTransaction(async tx => {
                await this.userDomain.deactivateForMaxPasswordAttemptInTx(
                    tx,
                    userId
                );
                await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
            });

            await this.sessionDomain.finalizeRevokeAll(userId, revokeAllEvents);

            this.activityLogDomain.stagePrepared(reachMaxEvents);
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async updatePasswordByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void> {
        if (userId === updatedBy) {
            throw new UserNotSelfException();
        }

        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedInvalidException();
        }

        try {
            const passwordString = this.authPasswordUtil.createPasswordRandom();
            const password = this.authPasswordUtil.createPassword(
                passwordString,
                {
                    temporary: true,
                }
            );

            const { updated, events } =
                await this.databaseService.withTransaction(async tx => {
                    const row = await this.userDomain.updatePasswordInTx(
                        tx,
                        userId,
                        password,
                        updatedBy
                    );
                    await this.passwordHistoryDomain.createInTx(
                        tx,
                        userId,
                        password.passwordHash,
                        EnumPasswordHistoryType.admin,
                        password.passwordPeriodExpired,
                        password.passwordCreated,
                        updatedBy
                    );
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        userId,
                        updatedBy,
                        password.passwordCreated
                    );

                    const actorMetadata =
                        this.userUtil.mapActivityLogActorMetadata(row);
                    const targetMetadata =
                        this.userUtil.mapActivityLogTargetMetadata(
                            row,
                            updatedBy
                        );

                    return {
                        updated: row,
                        events: [
                            this.activityLogDomain.prepare({
                                action: EnumActivityLogAction.adminUserUpdatePassword,
                                metadata: actorMetadata,
                            }),
                            this.activityLogDomain.prepare({
                                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                                userId,
                                createdBy: updatedBy,
                                metadata: targetMetadata,
                            }),
                        ],
                    };
                });
            await this.sessionDomain.purgeLoginsByUser(userId);

            this.activityLogDomain.stagePrepared(events);

            const passwordCreatedAt = this.helperDateService.formatToIso(
                password.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                password.passwordExpired
            );
            await this.notificationQueue.sendTemporaryPasswordByAdmin(
                updated.id,
                {
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
                updatedBy
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: IUserChangePassword
    ): Promise<void> {
        if (user.password) {
            const isPasswordAttemptMaxed =
                this.authPasswordUtil.checkPasswordAttempt(user);
            if (isPasswordAttemptMaxed) {
                throw new UserPasswordAttemptMaxException();
            }

            const isPasswordValid = this.authPasswordUtil.validatePassword(
                oldPassword,
                user.password
            );
            if (!isPasswordValid) {
                await this.userDomain.increasePasswordAttempt(user.id);

                throw new UserPasswordNotMatchException();
            }

            await this.userDomain.resetPasswordAttempt(user.id);

            const passwordHistories =
                await this.passwordHistoryDomain.getActiveByUser(user.id);
            const passwordCheck = this.authPasswordUtil.checkPasswordPeriod(
                passwordHistories,
                newPassword
            );
            if (passwordCheck) {
                const passwordExpiredAt =
                    this.helperDateService.formatToRFC2822(
                        passwordCheck.expiredAt
                    );

                throw new UserPasswordMustNewException(passwordExpiredAt);
            }
        }

        let twoFactorVerified: IAuthTwoFactorVerifyResult | undefined;
        if (user.twoFactor?.enabled) {
            twoFactorVerified =
                await this.userLoginDomain.handleTwoFactorValidation(user, {
                    code,
                    backupCode,
                    method,
                });
        }

        try {
            const password = this.authPasswordUtil.createPassword(newPassword);
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userChangePassword,
                }),
            ];
            if (twoFactorVerified) {
                const verifyTwoFactorEvent = this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                });
                events.push(verifyTwoFactorEvent);
            }

            await this.databaseService.withTransaction(async tx => {
                await this.userDomain.updatePasswordInTx(
                    tx,
                    user.id,
                    password,
                    user.id
                );
                await this.passwordHistoryDomain.createInTx(
                    tx,
                    user.id,
                    password.passwordHash,
                    EnumPasswordHistoryType.profile,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    user.id
                );
                await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    password.passwordCreated
                );
                if (twoFactorVerified) {
                    await this.userLoginDomain.recordTwoFactorVerificationInTx(
                        tx,
                        user,
                        twoFactorVerified
                    );
                }
            });
            await this.sessionDomain.purgeLoginsByUser(user.id);

            this.activityLogDomain.stagePrepared(events);

            await this.notificationQueue.sendChangePassword(user.id);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async forgotPassword(email: string): Promise<void> {
        await this.assertForgotPasswordAllowed();

        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        }

        const lastForgotPassword =
            await this.userPasswordRepository.findOneLatestByForgotPassword(
                user.id
            );
        if (lastForgotPassword) {
            const today = this.helperDateService.create();
            const canResendAt = this.helperDateService.forward(
                lastForgotPassword.createdAt,
                Duration.fromObject({
                    minutes: this.forgotResendInMinutes,
                })
            );

            if (today < canResendAt) {
                const resendDuration = this.helperDateService.diff(
                    today,
                    canResendAt
                );

                throw new UserForgotPasswordRequestLimitExceededException(
                    resendDuration.minutes
                );
            }
        }

        try {
            const resetPassword = this.forgotPasswordCreate();

            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userForgotPassword,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            await this.userPasswordRepository.createReplacingUnused(
                user.id,
                email,
                resetPassword
            );

            this.activityLogDomain.stagePrepared(events);

            const expiredAt = this.helperDateService.formatToIso(
                resetPassword.expiredAt
            );
            await this.notificationQueue.sendForgotPassword(user.id, {
                expiredAt,
                link: resetPassword.link,
                reference: resetPassword.reference,
                expiredInMinutes: resetPassword.expiredInMinutes,
                resendInMinutes: resetPassword.resendInMinutes,
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async resetPassword({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: IUserResetPassword): Promise<void> {
        await this.assertForgotPasswordAllowed();

        const hashedToken = this.helperHashService.sha256Hash(token);
        const resetPassword =
            await this.userPasswordRepository.findOneActiveByForgotPasswordToken(
                hashedToken
            );
        if (!resetPassword) {
            throw new UserNotFoundException();
        }

        const passwordHistories =
            await this.passwordHistoryDomain.getActiveByUser(
                resetPassword.userId
            );
        const passwordCheck = this.authPasswordUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            const passwordPeriodInDays =
                this.authPasswordUtil.getPasswordPeriodInDays();

            throw new UserPasswordMustNewException(passwordPeriodInDays);
        }

        let twoFactorVerified: IAuthTwoFactorVerifyResult | undefined;
        if (resetPassword.user.twoFactor?.enabled) {
            twoFactorVerified =
                await this.userLoginDomain.handleTwoFactorValidation(
                    resetPassword.user,
                    {
                        code,
                        backupCode,
                        method,
                    }
                );
        }

        try {
            const password = this.authPasswordUtil.createPassword(newPassword);
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userResetPassword,
                    userId: resetPassword.userId,
                    createdBy: resetPassword.userId,
                }),
            ];
            if (twoFactorVerified) {
                const verifyTwoFactorEvent = this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: resetPassword.userId,
                    createdBy: resetPassword.userId,
                });
                events.push(verifyTwoFactorEvent);
            }

            await this.databaseService.withTransaction(async tx => {
                await this.userDomain.updatePasswordInTx(
                    tx,
                    resetPassword.userId,
                    password,
                    resetPassword.userId
                );
                await this.passwordHistoryDomain.createInTx(
                    tx,
                    resetPassword.userId,
                    password.passwordHash,
                    EnumPasswordHistoryType.forgot,
                    password.passwordPeriodExpired,
                    password.passwordCreated,
                    resetPassword.userId
                );
                await this.userPasswordRepository.markUsedInTx(
                    tx,
                    resetPassword.id,
                    password.passwordCreated
                );
                await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    resetPassword.userId,
                    resetPassword.userId,
                    password.passwordCreated
                );
                if (twoFactorVerified) {
                    await this.userLoginDomain.recordTwoFactorVerificationInTx(
                        tx,
                        resetPassword.user,
                        twoFactorVerified
                    );
                }
            });
            await this.sessionDomain.purgeLoginsByUser(resetPassword.userId);

            this.activityLogDomain.stagePrepared(events);

            await this.notificationQueue.sendResetPassword(
                resetPassword.userId
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
