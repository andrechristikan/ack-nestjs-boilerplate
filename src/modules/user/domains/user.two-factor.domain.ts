import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import type {
    IAuthToken,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
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
import type {
    IUser,
    IUserTwoFactor,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorDomain {
    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly userLoginDomain: UserLoginDomain,
        private readonly userUtil: UserUtil,
        private readonly sessionDomain: SessionDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly authCache: AuthCache,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService
    ) {}

    async loginVerifyTwoFactor(
        challengeToken: string,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<IAuthToken> {
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
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userVerifyTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            await this.userLoginDomain.recordTwoFactorVerification(
                user,
                twoFactorVerified
            );

            this.activityLogDomain.stagePrepared(events);

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

        const pendingSecret = user.twoFactor?.pendingSecret;
        if (!pendingSecret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        await this.userLoginDomain.handleTwoFactorSetupValidation(
            user,
            pendingSecret,
            code
        );

        try {
            const backupCodes = this.authTwoFactorDomain.generateBackupCodes();
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userEnableTwoFactor,
                }),
            ];
            await this.userTwoFactorRepository.enableTwoFactor(
                user.id,
                pendingSecret,
                backupCodes.hashes
            );

            this.activityLogDomain.stagePrepared(events);

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    getTwoFactorStatus(user: IUser): IUserTwoFactor {
        return user.twoFactor!;
    }

    /** Starts an authenticator setup; while 2FA is enabled a valid unused backup code is required and consumed, and the account keeps its current state until the new authenticator is confirmed. */
    async setupTwoFactor(
        user: IUser,
        backupCode: string | null
    ): Promise<IUserTwoFactorSetup> {
        let backupCodeVerified: IAuthTwoFactorVerifyResult | null = null;
        if (user.twoFactor?.enabled) {
            if (!backupCode) {
                throw new AuthTwoFactorBackupCodeRequiredException();
            }

            backupCodeVerified =
                await this.userLoginDomain.handleTwoFactorValidation(user, {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode,
                });
        }

        try {
            const { encryptedSecret, otpauthUrl, secret } =
                await this.authTwoFactorDomain.setupTwoFactor(
                    user.id,
                    user.email
                );
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            if (backupCodeVerified) {
                const isSetUp =
                    await this.userTwoFactorRepository.setupTwoFactorConsumingBackupCode(
                        user.id,
                        encryptedSecret,
                        backupCodeVerified
                    );
                if (!isSetUp) {
                    throw new AuthTwoFactorInvalidException();
                }
            } else {
                await this.userTwoFactorRepository.setupTwoFactor(
                    user.id,
                    encryptedSecret
                );
            }

            this.activityLogDomain.stagePrepared(events);

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

    /** Confirms the pending authenticator with a code from it, makes it the account's secret, and issues a fresh set of backup codes. */
    async enableTwoFactor(user: IUser, code: string): Promise<string[]> {
        const pendingSecret = user.twoFactor?.pendingSecret;
        if (!pendingSecret && user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        } else if (!pendingSecret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        await this.userLoginDomain.handleTwoFactorSetupValidation(
            user,
            pendingSecret,
            code
        );

        try {
            const backupCodes = this.authTwoFactorDomain.generateBackupCodes();
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userEnableTwoFactor,
                }),
            ];
            await this.userTwoFactorRepository.enableTwoFactor(
                user.id,
                pendingSecret,
                backupCodes.hashes
            );

            this.activityLogDomain.stagePrepared(events);

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
        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        await this.userLoginDomain.handleTwoFactorValidation(user, {
            method,
            code,
            backupCode,
        });

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userDisableTwoFactor,
                }),
            ];
            const now = this.helperDateService.create();
            await this.databaseService.withTransaction(async tx => {
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
            });
            await this.sessionDomain.purgeLoginsByUser(user.id);

            this.activityLogDomain.stagePrepared(events);

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
        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        await this.userLoginDomain.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorDomain.generateBackupCodes();
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                }),
            ];
            await this.userTwoFactorRepository.regenerateTwoFactorBackupCodes(
                user.id,
                backupCodes.hashes
            );

            this.activityLogDomain.stagePrepared(events);

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
            const actorMetadata =
                this.userUtil.mapActivityLogActorMetadata(user);
            const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
                user,
                updatedBy
            );
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.adminUserResetTwoFactor,
                    metadata: actorMetadata,
                }),
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userResetTwoFactorByAdmin,
                    userId,
                    createdBy: updatedBy,
                    metadata: targetMetadata,
                }),
            ];
            const now = this.helperDateService.create();
            await Promise.all([
                this.databaseService.withTransaction(async tx => {
                    await this.userTwoFactorRepository.resetTwoFactorByAdminInTx(
                        tx,
                        userId
                    );
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        userId,
                        updatedBy,
                        now
                    );
                }),
                this.authCache.clearLockTwoFactorAttempt(user),
            ]);
            await this.sessionDomain.purgeLoginsByUser(userId);

            this.activityLogDomain.stagePrepared(events);

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
    ): Promise<IUserTwoFactor> {
        const twoFactor = await this.userTwoFactorRepository.createDisabledInTx(
            tx,
            userId,
            createdBy
        );

        return { ...twoFactor, backupCodes: [] };
    }
}
