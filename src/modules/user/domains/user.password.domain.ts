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
        private readonly helperStringService: HelperStringService
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        this.forgotExpiredInMinutes =
            this.configService.get<number>('forgotPassword.expiredInMs')! /
            ms('1m');
        this.forgotTokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        this.forgotResendInMinutes =
            this.configService.get<number>('forgotPassword.resendInMs')! /
            ms('1m');
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
        const link = this.forgotLinkPattern
            .replace('{homeUrl}', () => this.homeUrl)
            .replace('{token}', () => token);

        return {
            reference: this.forgotPasswordCreateReference(),
            expiredAt: this.forgotPasswordSetExpiredDate(),
            token,
            hashedToken,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link,
        };
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.userDomain.increasePasswordAttempt(userId);
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userDomain.resetPasswordAttempt(userId);
    }

    async reachMaxPasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.withTransaction(async tx => {
            const row =
                await this.userDomain.deactivateForMaxPasswordAttemptInTx(
                    tx,
                    userId
                );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: userId,
                createdBy: userId,
            });

            return row;
        });
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

            const { updated, revokedSessions } =
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
                    const sessions =
                        await this.sessionDomain.revokeActiveByUserInTx(
                            tx,
                            userId,
                            updatedBy,
                            password.passwordCreated
                        );

                    return { updated: row, revokedSessions: sessions };
                });
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

            await this.notificationQueue.sendTemporaryPasswordByAdmin(
                updated.id,
                {
                    password: passwordString,
                    passwordCreatedAt: this.helperDateService.formatToIso(
                        password.passwordCreated
                    ),
                    passwordExpiredAt: this.helperDateService.formatToIso(
                        password.passwordExpired
                    ),
                },
                updatedBy
            );

            this.activityLogDomain.stage({
                action: EnumActivityLogAction.adminUserUpdatePassword,
                metadata: this.userUtil.mapActivityLogActorMetadata(updated),
            });
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                userId,
                createdBy: updatedBy,
                metadata: this.userUtil.mapActivityLogTargetMetadata(
                    updated,
                    updatedBy
                ),
            });

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
            if (this.authPasswordUtil.checkPasswordAttempt(user)) {
                throw new UserPasswordAttemptMaxException();
            } else if (
                !this.authPasswordUtil.validatePassword(
                    oldPassword,
                    user.password
                )
            ) {
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
                throw new UserPasswordMustNewException(
                    this.helperDateService.formatToRFC2822(
                        passwordCheck.expiredAt
                    )
                );
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

            const revokedSessions = await this.databaseService.withTransaction(
                async tx => {
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
                    const sessions =
                        await this.sessionDomain.revokeActiveByUserInTx(
                            tx,
                            user.id,
                            user.id,
                            password.passwordCreated
                        );
                    this.activityLogDomain.stage({
                        action: EnumActivityLogAction.userChangePassword,
                    });
                    if (twoFactorVerified) {
                        await this.userLoginDomain.recordTwoFactorVerificationInTx(
                            tx,
                            user,
                            twoFactorVerified
                        );
                        this.activityLogDomain.stage({
                            action: EnumActivityLogAction.userVerifyTwoFactor,
                            userId: user.id,
                            createdBy: user.id,
                        });
                    }

                    return sessions;
                }
            );
            await this.sessionDomain.purgeRevokedLogins(
                user.id,
                revokedSessions
            );

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
                throw new UserForgotPasswordRequestLimitExceededException(
                    this.helperDateService.diff(today, canResendAt).minutes
                );
            }
        }

        try {
            const resetPassword = this.forgotPasswordCreate();

            await this.databaseService.withTransaction(async tx => {
                await this.userPasswordRepository.expireUnusedInTx(tx, user.id);
                await this.userPasswordRepository.createInTx(
                    tx,
                    user.id,
                    email,
                    resetPassword
                );
                this.activityLogDomain.stage({
                    action: EnumActivityLogAction.userForgotPassword,
                    userId: user.id,
                    createdBy: user.id,
                });
            });

            await this.notificationQueue.sendForgotPassword(user.id, {
                expiredAt: this.helperDateService.formatToIso(
                    resetPassword.expiredAt
                ),
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
            throw new UserPasswordMustNewException(
                this.authPasswordUtil.getPasswordPeriodInDays()
            );
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

            const revokedSessions = await this.databaseService.withTransaction(
                async tx => {
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
                    const sessions =
                        await this.sessionDomain.revokeActiveByUserInTx(
                            tx,
                            resetPassword.userId,
                            resetPassword.userId,
                            password.passwordCreated
                        );
                    this.activityLogDomain.stage({
                        action: EnumActivityLogAction.userResetPassword,
                        userId: resetPassword.userId,
                        createdBy: resetPassword.userId,
                    });
                    if (twoFactorVerified) {
                        await this.userLoginDomain.recordTwoFactorVerificationInTx(
                            tx,
                            resetPassword.user,
                            twoFactorVerified
                        );
                        this.activityLogDomain.stage({
                            action: EnumActivityLogAction.userVerifyTwoFactor,
                            userId: resetPassword.userId,
                            createdBy: resetPassword.userId,
                        });
                    }

                    return sessions;
                }
            );
            await this.sessionDomain.purgeRevokedLogins(
                resetPassword.userId,
                revokedSessions
            );

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
