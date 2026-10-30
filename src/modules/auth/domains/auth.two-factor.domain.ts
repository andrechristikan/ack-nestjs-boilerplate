import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { TwoFactor } from '@generated/prisma-client/client';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import type {
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
    IAuthTwoFactorSetup,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 2FA domain service: verifies codes against a stored secret, reads and sets up secrets, and holds the attempt policy. */
@Injectable()
export class AuthTwoFactorDomain {
    private readonly maxAttempt: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly sentryService: SentryService,
        private readonly authCache: AuthCache
    ) {
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
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
            if (err instanceof HelperDecryptFailedException) {
                this.sentryService.captureException(err);

                throw new AuthTwoFactorSecretUnavailableException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Verifies a TOTP code against the confirmed secret, or a backup code; a consumed backup code is returned removed in newBackupCodes. */
    async verifyTwoFactor(
        twoFactor: TwoFactor,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        const normalizedCode =
            method === EnumAuthTwoFactorMethod.code
                ? code?.trim()
                : backupCode?.trim();
        if (!normalizedCode) {
            return {
                isValid: false,
                method: method!,
                newBackupCodes: null,
            };
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.readSecret(twoFactor.secret, twoFactor.userId);
            const isValid = this.authTwoFactorUtil.verifyCode(
                secret,
                normalizedCode
            );

            return {
                isValid,
                method: method!,
                newBackupCodes: null,
            };
        }

        if (twoFactor.backupCodes.length === 0) {
            return {
                isValid: false,
                method: method!,
                newBackupCodes: null,
            };
        }

        const backupValidation = this.authTwoFactorUtil.verifyBackupCode(
            twoFactor.backupCodes,
            normalizedCode
        );
        if (!backupValidation.isValid) {
            return {
                isValid: false,
                method: method!,
                newBackupCodes: null,
            };
        }

        const updatedTwoFactorBackupCodes = [...twoFactor.backupCodes];
        updatedTwoFactorBackupCodes.splice(backupValidation.index, 1);

        return {
            isValid: true,
            method: method!,
            newBackupCodes: updatedTwoFactorBackupCodes,
        };
    }

    /** Verifies a TOTP code against a pending, unconfirmed secret. */
    verifySetupCode(
        encryptedPendingSecret: string,
        userId: string,
        code: string
    ): boolean {
        const pendingSecret = this.readSecret(encryptedPendingSecret, userId);

        return this.authTwoFactorUtil.verifyCode(pendingSecret, code.trim());
    }

    /** Generates a new secret, its encrypted form bound to the user, and the otpauth URL for 2FA enrollment. */
    async setupTwoFactor(
        userId: string,
        email: string
    ): Promise<IAuthTwoFactorSetup> {
        const secret = this.authTwoFactorUtil.generateSecret();
        const encryptedSecret = this.authTwoFactorUtil.encryptSecret(
            secret,
            userId
        );
        const otpAuthUrl = this.authTwoFactorUtil.createKeyUri(email, secret);

        return {
            otpauthUrl: otpAuthUrl,
            secret,
            encryptedSecret,
        };
    }

    /** Stores the login challenge under a random token. */
    async createChallenge(
        payload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge> {
        return this.authCache.setTwoFactorChallenge(payload);
    }

    async getChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        return this.authCache.getTwoFactorChallenge(token);
    }

    async deleteChallenge(token: string): Promise<void> {
        await this.authCache.deleteTwoFactorChallenge(token);
    }

    async clearLock(user: IUser): Promise<void> {
        await this.authCache.deleteTwoFactorLock(user);
    }

    async assertUnlocked(user: IUser): Promise<void> {
        const remainingMs = await this.authCache.getTwoFactorLockTtlInMs(user);
        if (remainingMs > 0) {
            throw new AuthTwoFactorAttemptTemporaryLockException(
                Math.ceil(remainingMs / 1000)
            );
        }
    }

    /** Judges one counted verification attempt before the code is checked: a count on a multiple of the max locks two-factor with the escalating TTL and any other count re-checks the lock a parallel request set; both answer the lock exception without verifying. */
    async assertAttemptAllowed(user: IUser, attempt: number): Promise<void> {
        if (attempt % this.maxAttempt !== 0) {
            await this.assertUnlocked(user);

            return;
        }

        const counted: IUser =
            user.twoFactor === null
                ? user
                : { ...user, twoFactor: { ...user.twoFactor, attempt } };
        await this.authCache.setTwoFactorLock(counted);
        const remainingMs =
            await this.authCache.getTwoFactorLockTtlInMs(counted);

        throw new AuthTwoFactorAttemptTemporaryLockException(
            Math.ceil(remainingMs / 1000)
        );
    }
}
