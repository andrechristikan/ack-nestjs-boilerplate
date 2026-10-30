import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { UserTwoFactorCache } from '@modules/user/caches/user.two-factor.cache';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserTwoFactorLoginSetup,
    IUserTwoFactorSetupSecret,
    IUserTwoFactorVerifyInput,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserTwoFactorDomain {
    private readonly maxAttempt: number;

    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly userTwoFactorCache: UserTwoFactorCache,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly sentryService: SentryService,
        private readonly configService: ConfigService
    ) {
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
    }

    private getEnabledTwoFactor({ twoFactor }: IUser): TwoFactor {
        if (!twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        return twoFactor;
    }

    private assertMethodProvided(
        method: EnumAuthTwoFactorMethod | null
    ): asserts method is EnumAuthTwoFactorMethod {
        if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }
    }

    private async assertUnlocked(user: IUser): Promise<void> {
        const remainingMs =
            await this.userTwoFactorCache.getTwoFactorLockTtlInMs(user);
        if (remainingMs > 0) {
            throw new AuthTwoFactorAttemptTemporaryLockException(
                Math.ceil(remainingMs / 1000)
            );
        }
    }

    /** Counts one verification attempt and judges it before the code is checked: a count on a multiple of the max locks two-factor with the escalating TTL and any other count re-checks the lock a parallel request set; both answer the lock exception without verifying. */
    private async countAttempt(user: IUser): Promise<void> {
        const attempt = await this.userTwoFactorRepository.incrementAttempt(
            user.id
        );
        if (attempt % this.maxAttempt !== 0) {
            await this.assertUnlocked(user);

            return;
        }

        const counted: IUser =
            user.twoFactor === null
                ? user
                : { ...user, twoFactor: { ...user.twoFactor, attempt } };
        await this.userTwoFactorCache.setTwoFactorLock(counted);
        const remainingMs =
            await this.userTwoFactorCache.getTwoFactorLockTtlInMs(counted);

        throw new AuthTwoFactorAttemptTemporaryLockException(
            Math.ceil(remainingMs / 1000)
        );
    }

    /** An absent secret is an expected account state; a secret that fails to decrypt is an operator fault and is reported. */
    private readSecret(encryptedSecret: string | null, userId: string): string {
        if (!encryptedSecret) {
            throw new AuthTwoFactorSecretUnavailableException();
        }

        try {
            return this.authTwoFactorUtil.decryptSecret(
                encryptedSecret,
                userId
            );
        } catch (err: unknown) {
            const exception = this.authTwoFactorUtil.toDecryptException(err);
            if (exception !== null) {
                this.sentryService.captureException(err);
            }

            throw exception ?? new AppUnknownException(err);
        }
    }

    /** Checks a TOTP code against the confirmed secret, or a backup code against the stored hashes; null when it does not match, otherwise the backup codes left once a used one is removed. */
    private checkCode(
        twoFactor: TwoFactor,
        method: EnumAuthTwoFactorMethod,
        { code, backupCode }: IUserTwoFactorVerifyInput
    ): IUserTwoFactorVerifyResult | null {
        const normalizedCode =
            method === EnumAuthTwoFactorMethod.code
                ? code?.trim()
                : backupCode?.trim();
        if (!normalizedCode) {
            return null;
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.readSecret(twoFactor.secret, twoFactor.userId);

            const isValid = this.authTwoFactorUtil.verifyCode(
                secret,
                normalizedCode
            );

            return isValid ? { method, newBackupCodes: null } : null;
        }

        if (twoFactor.backupCodes.length === 0) {
            return null;
        }

        const backupValidation = this.authTwoFactorUtil.verifyBackupCode(
            twoFactor.backupCodes,
            normalizedCode
        );
        if (!backupValidation.isValid) {
            return null;
        }

        const newBackupCodes = [...twoFactor.backupCodes];
        newBackupCodes.splice(backupValidation.index, 1);

        return { method, newBackupCodes };
    }

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

    /** Counts one verification attempt, checks the code or backup code against the confirmed secret, and resets the counter on a match; a backup code is not consumed here. */
    async verify(
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorVerifyResult> {
        // Sequential by design: gate before the work it guards
        await this.assertUnlocked(user);
        this.assertMethodProvided(input.method);
        const twoFactor = this.getEnabledTwoFactor(user);

        // Sequential by design: gate before the work it guards
        await this.countAttempt(user);

        const verified = this.checkCode(twoFactor, input.method, input);
        if (!verified) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);

        return verified;
    }

    /** Counts one verification attempt, checks a code from a newly set-up authenticator against the pending secret, and resets the counter on a match. */
    async verifySetupCode(
        user: IUser,
        pendingSecret: string,
        code: string
    ): Promise<void> {
        // Sequential by design: gate before the work it guards
        await this.assertUnlocked(user);
        // Sequential by design: gate before the work it guards
        await this.countAttempt(user);

        const secret = this.readSecret(pendingSecret, user.id);
        const isValid = this.authTwoFactorUtil.verifyCode(secret, code.trim());
        if (!isValid) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);
    }

    /** Generates a new secret with its encrypted form bound to the user and the otpauth URL for enrollment. */
    async setup(user: IUser): Promise<IUserTwoFactorSetupSecret> {
        const secret = this.authTwoFactorUtil.generateSecret();
        const encryptedSecret = this.authTwoFactorUtil.encryptSecret(
            secret,
            user.id
        );
        const otpauthUrl = this.authTwoFactorUtil.createKeyUri(
            user.email,
            secret
        );

        return { secret, otpauthUrl, encryptedSecret };
    }

    async clearLock(user: IUser): Promise<void> {
        await this.userTwoFactorCache.deleteTwoFactorLock(user);
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
        verified: IUserTwoFactorVerifyResult
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

    getBackupCodeForSetup(
        user: IUser,
        backupCode: string | null
    ): string | null {
        if (!user.twoFactor?.enabled) {
            return null;
        }

        if (!backupCode) {
            throw new AuthTwoFactorBackupCodeRequiredException();
        }

        return backupCode;
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
        verified: IUserTwoFactorVerifyResult
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
        verified: IUserTwoFactorVerifyResult
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
