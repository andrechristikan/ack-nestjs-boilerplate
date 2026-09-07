import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
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
import { IUserPasswordService } from '@modules/user/interfaces/user.password.service.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { EnumUserStatus } from '@generated/prisma-client';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

@Injectable()
export class UserPasswordService implements IUserPasswordService {
    private readonly homeUrl: string;

    private readonly forgotPasswordReferencePrefix: string;
    private readonly forgotPasswordReferenceLength: number;
    private readonly forgotExpiredInMinutes: number;
    private readonly forgotTokenLength: number;
    private readonly forgotResendInMinutes: number;
    private readonly forgotLinkBaseUrl: string;

    constructor(
        private readonly userPasswordRepository: UserPasswordRepository,
        private readonly userRepository: UserRepository,
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly userUtil: UserUtil,
        private readonly helperHashService: HelperHashService,
        private readonly userLoginService: UserLoginService,
        private readonly authPasswordService: AuthPasswordService,
        private readonly notificationQueue: NotificationQueue,
        private readonly featureFlagService: FeatureFlagService,
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
        this.forgotLinkBaseUrl = this.configService.get<string>(
            'forgotPassword.linkBaseUrl'
        )!;
    }

    private async assertForgotPasswordAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
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
        const link = `${this.homeUrl}/${this.forgotLinkBaseUrl}/${token}`;
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
            const passwordString =
                this.authPasswordService.createPasswordRandom();
            const password = this.authPasswordService.createPassword(
                userId,
                passwordString,
                {
                    temporary: true,
                }
            );

            await this.userLoginService.revokeAllSessions(userId);

            const updated =
                await this.userPasswordRepository.updatePasswordByAdmin(
                    userId,
                    password,
                    requestLog,
                    updatedBy
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
            if (this.authPasswordService.checkPasswordAttempt(user)) {
                throw new UserPasswordAttemptMaxException();
            } else if (
                !this.authPasswordService.validatePassword(
                    oldPassword,
                    user.password
                )
            ) {
                await this.userPasswordRepository.increasePasswordAttempt(
                    user.id
                );

                throw new UserPasswordNotMatchException();
            }

            await this.userPasswordRepository.resetPasswordAttempt(user.id);

            const passwordHistories =
                await this.passwordHistoryService.getActiveByUser(user.id);
            const passwordCheck = this.authPasswordService.checkPasswordPeriod(
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
                await this.userLoginService.handleTwoFactorValidation(user, {
                    code,
                    backupCode,
                    method,
                });
        }

        try {
            const password = this.authPasswordService.createPassword(
                user.id,
                newPassword
            );

            await this.userLoginService.revokeAllSessions(user.id);
            await Promise.all([
                this.userPasswordRepository.changePassword(
                    user.id,
                    password,
                    requestLog
                ),
                twoFactorVerified
                    ? this.userTwoFactorRepository.verifyTwoFactor(
                          user.id,
                          twoFactorVerified,
                          requestLog
                      )
                    : Promise.resolve(),
            ]);

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

            await this.userPasswordRepository.forgotPassword(
                user.id,
                email,
                resetPassword,
                requestLog
            );

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
            await this.passwordHistoryService.getActiveByUser(
                resetPassword.userId
            );
        const passwordCheck = this.authPasswordService.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            throw new UserPasswordMustNewException(
                this.authPasswordService.getPasswordPeriodInDays()
            );
        }

        let twoFactorVerified: IAuthTwoFactorVerifyResult | undefined;
        if (resetPassword.user.twoFactor?.enabled) {
            twoFactorVerified =
                await this.userLoginService.handleTwoFactorValidation(
                    resetPassword.user,
                    {
                        code,
                        backupCode,
                        method,
                    }
                );
        }

        try {
            const password = this.authPasswordService.createPassword(
                resetPassword.userId,
                newPassword
            );

            await this.userLoginService.revokeAllSessions(resetPassword.userId);
            await Promise.all([
                this.userPasswordRepository.resetPassword(
                    resetPassword.userId,
                    resetPassword.id,
                    password,
                    requestLog
                ),
                twoFactorVerified
                    ? this.userTwoFactorRepository.verifyTwoFactor(
                          resetPassword.userId,
                          twoFactorVerified,
                          requestLog
                      )
                    : Promise.resolve(),
            ]);

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
