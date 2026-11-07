import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { AuthTwoFactorMethodRequiredException } from '@modules/auth/exceptions/auth.two-factor-method-required.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserTwoFactorAttempt,
    IUserTwoFactorChecked,
    IUserTwoFactorLoginSetup,
    IUserTwoFactorSetupSecret,
    IUserTwoFactorVerifyInput,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserTwoFactorService {
    private readonly maxAttempt: number;

    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly sentryService: SentryService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly userQueue: UserQueue,
        private readonly userUtil: UserUtil,
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

    private checkCode(
        twoFactor: TwoFactor,
        method: EnumAuthTwoFactorMethod,
        { code, backupCode }: IUserTwoFactorVerifyInput
    ): IUserTwoFactorChecked | null {
        const normalizedCode =
            method === EnumAuthTwoFactorMethod.code
                ? code?.trim()
                : backupCode?.trim();
        if (!normalizedCode) {
            return null;
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.readSecret(twoFactor.secret, twoFactor.userId);

            const totpStep = this.authTwoFactorUtil.verifyCode(
                secret,
                normalizedCode
            );

            return totpStep === null
                ? null
                : { verified: { method, newBackupCodes: null }, totpStep };
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

        return {
            verified: { method, newBackupCodes },
            totpStep: null,
        };
    }

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

    /** Counts one two-factor attempt before the code is checked and enqueues the lockout job when the budget is spent; isAttemptCounted false with the lockout activity stages on a spent budget, lockoutStages empty otherwise. */
    async countAttempt(user: IUser): Promise<IUserTwoFactorAttempt> {
        const attempt = await this.userTwoFactorRepository.incrementAttempt(
            user.id,
            this.maxAttempt
        );
        if (attempt === null) {
            await this.userQueue.lockout(user.id);
            const lockoutStages = this.userUtil.buildTwoFactorLockoutStages(
                user.id
            );

            return { isAttemptCounted: false, lockoutStages };
        }

        return { isAttemptCounted: true, lockoutStages: [] };
    }

    assertAttemptCounted(isAttemptCounted: boolean): void {
        if (!isAttemptCounted) {
            throw new AuthTwoFactorAttemptMaxException();
        }
    }

    getProvidedMethod(
        method: EnumAuthTwoFactorMethod | null
    ): EnumAuthTwoFactorMethod {
        if (!method) {
            throw new AuthTwoFactorMethodRequiredException();
        }

        return method;
    }

    /** Checks the code or backup code against the confirmed secret, accepts each TOTP step once, and resets the counter on a match; the caller counts the attempt and a backup code is not consumed here. */
    async verify(
        user: IUser,
        input: IUserTwoFactorVerifyInput
    ): Promise<IUserTwoFactorVerifyResult> {
        const method = this.getProvidedMethod(input.method);
        const twoFactor = this.getEnabledTwoFactor(user);

        const checked = this.checkCode(twoFactor, method, input);
        if (!checked) {
            throw new AuthTwoFactorInvalidException();
        }

        if (checked.totpStep !== null) {
            // Sequential by design: the attempt resets only after the step is accepted
            const isStepAccepted =
                await this.userTwoFactorRepository.markTotpUsed(
                    user.id,
                    checked.totpStep
                );
            if (!isStepAccepted) {
                throw new AuthTwoFactorInvalidException();
            }
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);

        return checked.verified;
    }

    /** Checks a code against the pending secret, accepts each TOTP step once, and resets the counter on a match; the caller counts the attempt. */
    async verifySetupCode(
        user: IUser,
        pendingSecret: string,
        code: string
    ): Promise<void> {
        const secret = this.readSecret(pendingSecret, user.id);
        const totpStep = this.authTwoFactorUtil.verifyCode(secret, code.trim());
        if (totpStep === null) {
            throw new AuthTwoFactorInvalidException();
        }

        // Sequential by design: the attempt resets only after the step is accepted
        const isStepAccepted = await this.userTwoFactorRepository.markTotpUsed(
            user.id,
            totpStep
        );
        if (!isStepAccepted) {
            throw new AuthTwoFactorInvalidException();
        }

        await this.userTwoFactorRepository.resetTwoFactorAttempt(user.id);
    }

    /** Generates the secret, its encrypted form bound to the user, and the otpauth URL for enrollment, storing nothing. */
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

    /** Makes the pending secret the account's secret and returns plain backup codes, storing only their hashes; a pending secret that no longer matches, or a write conflict over it, throws the setup-required exception. */
    async enableTwoFactor(
        userId: string,
        pendingSecret: string
    ): Promise<string[]> {
        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            const isEnabled =
                await this.userTwoFactorRepository.enableTwoFactor(
                    userId,
                    pendingSecret,
                    backupCodes.hashes
                );
            if (!isEnabled) {
                throw new AuthTwoFactorSetupRequiredException();
            }

            return backupCodes.codes;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new AuthTwoFactorSetupRequiredException();
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
        const isDisabled =
            await this.userTwoFactorRepository.disableTwoFactorInTx(tx, userId);
        if (!isDisabled) {
            throw new AuthTwoFactorNotEnabledException();
        }
    }

    async removeInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.deleteByUserInTx(tx, userId);
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

    async resetAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userTwoFactorRepository.resetTwoFactorAttemptInTx(
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
            const isRegenerated =
                await this.userTwoFactorRepository.regenerateTwoFactorBackupCodes(
                    userId,
                    backupCodes.hashes
                );
            if (!isRegenerated) {
                throw new AuthTwoFactorNotEnabledException();
            }

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
