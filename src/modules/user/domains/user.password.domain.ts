import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumUserStatus,
    User,
} from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
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
import {
    IUser,
    IUserChangePassword,
    IUserForgotPasswordCreate,
    IUserResetPassword,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
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
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
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
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperEncryptionService: HelperEncryptionService
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

    forgotPasswordCreate(userId: string): IUserForgotPasswordCreate {
        const token = this.forgotPasswordCreateToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.forgotLinkPattern
            .replace('{homeUrl}', this.homeUrl)
            .replace('{token}', token);
        const encryptedLink = this.helperEncryptionService.aes256EncryptSimple(
            link,
            userId
        );

        return {
            reference: this.forgotPasswordCreateReference(),
            expiredAt: this.forgotPasswordSetExpiredDate(),
            token,
            hashedToken,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link,
            encryptedLink,
        };
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.userDomain.increasePasswordAttempt(userId);
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userDomain.resetPasswordAttempt(userId);
    }

    async reachMaxPasswordAttempt(userId: string): Promise<User> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        return this.databaseService.client.$transaction(async tx => {
            const row =
                await this.userDomain.deactivateForMaxPasswordAttemptInTx(
                    tx,
                    userId
                );
            await this.activityLogDomain.recordInTx(
                tx,
                userId,
                EnumActivityLogAction.userReachMaxPasswordAttempt,
                requestLog,
                null
            );

            return row;
        });
    }

    async updatePasswordByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
                userId,
                passwordString,
                {
                    temporary: true,
                }
            );

            await this.userLoginDomain.revokeAllSessions(userId);

            const updated = await this.databaseService.client.$transaction(
                async tx => {
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
                    await this.activityLogDomain.recordInTx(
                        tx,
                        updatedBy,
                        EnumActivityLogAction.userUpdatePasswordByAdmin,
                        requestLog,
                        null
                    );

                    return row;
                }
            );

            await this.notificationQueue.sendTemporaryPasswordByAdmin(
                updated.id,
                {
                    password: password.passwordEncrypted,
                    passwordCreatedAt: this.helperDateService.formatToIso(
                        password.passwordCreated
                    ),
                    passwordExpiredAt: this.helperDateService.formatToIso(
                        password.passwordExpired
                    ),
                },
                updatedBy
            );

            this.requestStoreService.merge<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey,
                this.userUtil.mapActivityLogMetadata(updated)
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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
            const password = this.authPasswordUtil.createPassword(
                user.id,
                newPassword
            );

            await this.userLoginDomain.revokeAllSessions(user.id);
            await this.databaseService.client.$transaction(async tx => {
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
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userChangePassword,
                    requestLog,
                    null
                );
                if (twoFactorVerified) {
                    await this.userTwoFactorRepository.verifyTwoFactorInTx(
                        tx,
                        user.id,
                        twoFactorVerified
                    );
                    await this.activityLogDomain.recordInTx(
                        tx,
                        user.id,
                        EnumActivityLogAction.userVerifyTwoFactor,
                        requestLog,
                        null
                    );
                }
            });

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

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
            const resetPassword = this.forgotPasswordCreate(user.id);

            await this.databaseService.client.$transaction(async tx => {
                await this.userPasswordRepository.expireUnusedInTx(tx, user.id);
                await this.userPasswordRepository.createInTx(
                    tx,
                    user.id,
                    email,
                    resetPassword
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userForgotPassword,
                    requestLog,
                    null
                );
            });

            await this.notificationQueue.sendForgotPassword(user.id, {
                expiredAt: this.helperDateService.formatToIso(
                    resetPassword.expiredAt
                ),
                link: resetPassword.encryptedLink,
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

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
            const password = this.authPasswordUtil.createPassword(
                resetPassword.userId,
                newPassword
            );

            await this.userLoginDomain.revokeAllSessions(resetPassword.userId);
            await this.databaseService.client.$transaction(async tx => {
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
                await this.activityLogDomain.recordInTx(
                    tx,
                    resetPassword.userId,
                    EnumActivityLogAction.userResetPassword,
                    requestLog,
                    null
                );
                if (twoFactorVerified) {
                    await this.userTwoFactorRepository.verifyTwoFactorInTx(
                        tx,
                        resetPassword.userId,
                        twoFactorVerified
                    );
                    await this.activityLogDomain.recordInTx(
                        tx,
                        resetPassword.userId,
                        EnumActivityLogAction.userVerifyTwoFactor,
                        requestLog,
                        null
                    );
                }
            });

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
