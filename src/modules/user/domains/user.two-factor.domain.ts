import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumUserStatus,
    TwoFactor,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import {
    IAuthToken,
    IAuthTwoFactorVerify,
} from '@modules/auth/interfaces/auth.interface';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import {
    IUser,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorDomain {
    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly userLoginDomain: UserLoginDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly authCache: AuthCache,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async loginVerifyTwoFactor(
        challengeToken: string,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<IAuthToken> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const challenge = await this.authCache.getChallenge(challengeToken);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        } else if (user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorRequiredSetupException();
        }

        const twoFactorVerified =
            await this.userLoginDomain.handleTwoFactorValidation(user, {
                method,
                code,
                backupCode,
            });

        try {
            const loginAt = this.helperDateService.create();
            const [tokens] = await Promise.all([
                this.userLoginDomain.createTokenAndSession(
                    user,
                    challenge.device,
                    challenge.loginFrom,
                    challenge.loginWith,
                    loginAt
                ),
                this.authCache.clearChallenge(challengeToken),
                this.databaseService.client.$transaction(async tx => {
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
                }),
            ]);

            return tokens;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async loginSetupTwoFactor(
        challengeToken: string,
        code: string
    ): Promise<string[]> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const challenge = await this.authCache.getChallenge(challengeToken);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        } else if (!user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorNotRequiredSetupException();
        }

        await this.userLoginDomain.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorDomain.generateBackupCodes();
            await this.databaseService.client.$transaction(async tx => {
                await this.userTwoFactorRepository.enableTwoFactorInTx(
                    tx,
                    user.id,
                    backupCodes.hashes
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userEnableTwoFactor,
                    requestLog,
                    null
                );
            });

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    getTwoFactorStatus(user: IUser): TwoFactor {
        return user.twoFactor!;
    }

    async setupTwoFactor(user: IUser): Promise<IUserTwoFactorSetup> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        }

        try {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorDomain.setupTwoFactor(user.email);
            await this.databaseService.client.$transaction(async tx => {
                await this.userTwoFactorRepository.setupTwoFactorInTx(
                    tx,
                    user.id,
                    encryptedSecret,
                    iv
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userSetupTwoFactor,
                    requestLog,
                    null
                );
            });

            return {
                secret,
                otpauthUrl,
            };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async enableTwoFactor(user: IUser, code: string): Promise<string[]> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        } else if (!user.twoFactor?.iv || !user.twoFactor?.secret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        await this.userLoginDomain.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorDomain.generateBackupCodes();
            await this.databaseService.client.$transaction(async tx => {
                await this.userTwoFactorRepository.enableTwoFactorInTx(
                    tx,
                    user.id,
                    backupCodes.hashes
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userEnableTwoFactor,
                    requestLog,
                    null
                );
            });

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        await this.userLoginDomain.handleTwoFactorValidation(user, {
            method,
            code,
            backupCode,
        });

        try {
            await this.userLoginDomain.revokeAllSessions(user.id);
            const now = this.helperDateService.create();
            await this.databaseService.client.$transaction(async tx => {
                await this.userTwoFactorRepository.disableTwoFactorInTx(
                    tx,
                    user.id
                );
                await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    user.id,
                    user.id,
                    now
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userDisableTwoFactor,
                    requestLog,
                    null
                );
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async regenerateTwoFactorBackupCodes(
        user: IUser,
        code: string
    ): Promise<string[]> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        await this.userLoginDomain.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorDomain.generateBackupCodes();
            await this.databaseService.client.$transaction(async tx => {
                await this.userTwoFactorRepository.regenerateTwoFactorBackupCodesInTx(
                    tx,
                    user.id,
                    backupCodes.hashes
                );
                await this.activityLogDomain.recordInTx(
                    tx,
                    user.id,
                    EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                    requestLog,
                    null
                );
            });

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (userId === updatedBy) {
            throw new UserNotSelfException();
        }

        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedInvalidException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        try {
            await this.userLoginDomain.revokeAllSessions(userId);
            const now = this.helperDateService.create();
            await Promise.all([
                this.databaseService.client.$transaction(async tx => {
                    await this.userTwoFactorRepository.resetTwoFactorByAdminInTx(
                        tx,
                        userId,
                        updatedBy
                    );
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        userId,
                        updatedBy,
                        now
                    );
                    await this.activityLogDomain.recordInTx(
                        tx,
                        updatedBy,
                        EnumActivityLogAction.adminUserResetTwoFactor,
                        requestLog,
                        null
                    );
                }),
                this.authCache.clearLockTwoFactorAttempt(user),
            ]);

            await this.notificationQueue.sendResetTwoFactorByAdmin(
                user.id,
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

    async createDisabledInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        createdBy: string
    ): Promise<TwoFactor> {
        return this.userTwoFactorRepository.createDisabledInTx(
            tx,
            userId,
            createdBy
        );
    }
}
