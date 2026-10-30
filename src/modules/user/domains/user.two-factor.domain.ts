import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import type { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserTwoFactorLoginSetup,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorDomain {
    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil
    ) {}

    /** Resolves the active, verified user of a login challenge whose two-factor is enabled. */
    private async getOneEnabledForLogin(userId: string): Promise<IUser> {
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        return user;
    }

    async getOneForLoginVerify(userId: string): Promise<IUser> {
        const user = await this.getOneEnabledForLogin(userId);
        if (user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorRequiredSetupException();
        }

        return user;
    }

    async getOneForLoginSetup(
        userId: string
    ): Promise<IUserTwoFactorLoginSetup> {
        const user = await this.getOneEnabledForLogin(userId);
        if (!user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorNotRequiredSetupException();
        }

        const pendingSecret = user.twoFactor.pendingSecret;
        if (!pendingSecret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        return { user, pendingSecret };
    }

    async incrementAttempt(userId: string): Promise<number> {
        return this.userTwoFactorRepository.incrementAttempt(userId);
    }

    async resetAttempt(userId: string): Promise<void> {
        await this.userTwoFactorRepository.resetTwoFactorAttempt(userId);
    }

    async saveSetup(userId: string, encryptedSecret: string): Promise<void> {
        await this.userTwoFactorRepository.setupTwoFactor(
            userId,
            encryptedSecret
        );
    }

    /** Stores the pending secret and consumes the verified backup code; the code is consumed only while the stored codes are still the ones it was verified against, otherwise the setup is rejected. */
    async saveSetupConsumingBackupCode(
        user: IUser,
        encryptedSecret: string,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<void> {
        const isSetUp =
            await this.userTwoFactorRepository.setupTwoFactorConsumingBackupCode(
                user.id,
                encryptedSecret,
                verified,
                user.twoFactor?.backupCodes ?? []
            );
        if (!isSetUp) {
            throw new AuthTwoFactorInvalidException();
        }
    }

    getPendingSecret(user: IUser): string {
        const pendingSecret = user.twoFactor?.pendingSecret;
        if (!pendingSecret && user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        } else if (!pendingSecret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        return pendingSecret;
    }

    /** Makes the pending authenticator the account's secret and issues a fresh set of backup codes. */
    async enableTwoFactor(
        userId: string,
        pendingSecret: string
    ): Promise<string[]> {
        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userTwoFactorRepository.enableTwoFactor(
                userId,
                pendingSecret,
                backupCodes.hashes
            );

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    assertEnabled(user: IUser): void {
        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }
    }

    async disableInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.disableTwoFactorInTx(tx, userId);
    }

    async resetByAdminInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.resetTwoFactorByAdminInTx(
            tx,
            userId
        );
    }

    /** Persists a successful 2FA check in the caller's transaction; a backup code is consumed only while the stored codes are still the ones it was verified against, otherwise the check is rejected. */
    async recordVerificationInTx(
        tx: IDatabaseTransactionClient,
        user: IUser,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<void> {
        const recorded = await this.userTwoFactorRepository.verifyTwoFactorInTx(
            tx,
            user.id,
            verified,
            user.twoFactor?.backupCodes ?? []
        );
        if (!recorded) {
            throw new AuthTwoFactorInvalidException();
        }
    }

    /** Persists a successful 2FA check; a backup code is consumed only while the stored codes are still the ones it was verified against, otherwise the check is rejected. */
    async recordVerification(
        user: IUser,
        verified: IAuthTwoFactorVerifyResult
    ): Promise<void> {
        const recorded = await this.userTwoFactorRepository.verifyTwoFactor(
            user.id,
            verified,
            user.twoFactor?.backupCodes ?? []
        );
        if (!recorded) {
            throw new AuthTwoFactorInvalidException();
        }
    }

    async regenerateTwoFactorBackupCodes(userId: string): Promise<string[]> {
        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userTwoFactorRepository.regenerateTwoFactorBackupCodes(
                userId,
                backupCodes.hashes
            );

            return backupCodes.codes;
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
