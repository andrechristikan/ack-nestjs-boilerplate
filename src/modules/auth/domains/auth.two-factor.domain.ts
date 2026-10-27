import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { AuthTwoFactorSecretEncryptionPurpose } from '@modules/auth/constants/auth.constant';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import type {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorBackupCodesVerifyResult,
    IAuthTwoFactorSetup,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import type {
    IUser,
    IUserTwoFactor,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, verifySync } from 'otplib';
import type { HashAlgorithm, OTPStrategy } from 'otplib';

/** 2FA domain service: TOTP codes, backup codes, secret encryption, and attempt policy. */
@Injectable()
export class AuthTwoFactorDomain {
    private readonly strategy: OTPStrategy;
    private readonly algorithm: HashAlgorithm;
    private readonly digits: number;
    private readonly periodInSeconds: number;
    private readonly window: number;
    private readonly secretLength: number;
    private readonly backupCodesCount: number;
    private readonly backupCodesLength: number;
    private readonly encryptionKey: string;
    private readonly maxAttempt: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly sentryService: SentryService
    ) {
        this.strategy = this.configService.get<OTPStrategy>(
            'auth.twoFactor.strategy'
        )!;
        this.algorithm = this.configService.get<HashAlgorithm>(
            'auth.twoFactor.algorithm'
        )!;
        this.digits = this.configService.get<number>('auth.twoFactor.digits')!;
        this.periodInSeconds = this.configService.get<number>(
            'auth.twoFactor.periodInSeconds'
        )!;
        this.window = this.configService.get<number>('auth.twoFactor.window')!;
        this.secretLength = this.configService.get<number>(
            'auth.twoFactor.secretLength'
        )!;
        this.backupCodesCount = this.configService.get<number>(
            'auth.twoFactor.backupCodes.count'
        )!;
        this.backupCodesLength = this.configService.get<number>(
            'auth.twoFactor.backupCodes.length'
        )!;
        this.encryptionKey = this.configService.get<string>(
            'auth.twoFactor.encryption.key'
        )!;
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        )!;
    }

    private encryptSecret(secret: string, userId: string): string {
        return this.helperEncryptionService.aes256Encrypt(
            secret,
            this.encryptionKey,
            AuthTwoFactorSecretEncryptionPurpose,
            userId
        );
    }

    private decryptSecret(encryptedSecret: string, userId: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encryptedSecret,
            this.encryptionKey,
            AuthTwoFactorSecretEncryptionPurpose,
            userId
        );
    }

    /** An absent secret is an expected account state; a secret that fails to decrypt is an operator fault and is reported. */
    private readSecret(encryptedSecret: string | null, userId: string): string {
        if (!encryptedSecret) {
            throw new AuthTwoFactorSecretUnavailableException();
        }

        try {
            return this.decryptSecret(encryptedSecret, userId);
        } catch (err: unknown) {
            if (err instanceof HelperDecryptFailedException) {
                this.sentryService.captureException(err);

                throw new AuthTwoFactorSecretUnavailableException();
            }

            throw err;
        }
    }

    generateSecret(): string {
        return generateSecret({
            length: this.secretLength,
        });
    }

    /** Verifies a TOTP code against the secret, allowing a configurable time-step window. */
    verifyCode(secret: string, code: string): boolean {
        const verified = verifySync({
            token: code,
            secret,
            algorithm: this.algorithm,
            strategy: this.strategy,
            digits: this.digits,
            period: this.periodInSeconds,
            epochTolerance: [this.window * this.periodInSeconds, 0],
        });

        return verified.valid;
    }

    /** Generates uppercase alphanumeric recovery backup codes plus their SHA-256 hashes for storage. */
    generateBackupCodes(): IAuthTwoFactorBackupCodes {
        const codes = Array.from({ length: this.backupCodesCount }, () =>
            this.helperStringService.randomUppercase(this.backupCodesLength)
        );

        return {
            codes,
            hashes: codes.map(code => this.helperHashService.sha256Hash(code)),
        };
    }

    /** Matches an input code against stored hashes, returning the matched index. */
    verifyBackupCode(
        backupCodes: string[],
        input: string
    ): IAuthTwoFactorBackupCodesVerifyResult {
        const codeHash = this.helperHashService.sha256Hash(input);
        const index = backupCodes.findIndex(hash =>
            this.helperHashService.sha256Compare(hash, codeHash)
        );

        return {
            isValid: index > -1,
            index,
        };
    }

    /** Verifies a TOTP code against the confirmed secret, or a backup code; a consumed backup code is returned removed in newBackupCodes. */
    async verifyTwoFactor(
        twoFactor: IUserTwoFactor,
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
            };
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.readSecret(twoFactor.secret, twoFactor.userId);
            const isValid = this.verifyCode(secret, normalizedCode);

            return {
                isValid,
                method: method!,
            };
        }

        if (twoFactor.backupCodes.length === 0) {
            return {
                isValid: false,
                method: method!,
            };
        }

        const activeBackupCodes = twoFactor.backupCodes.filter(
            backupCode => !backupCode.usedAt
        );
        const backupValidation = this.verifyBackupCode(
            activeBackupCodes.map(backupCode => backupCode.codeHash),
            normalizedCode
        );
        if (!backupValidation.isValid) {
            return {
                isValid: false,
                method: method!,
            };
        }

        return {
            isValid: true,
            method: method!,
            usedBackupCodeHash:
                activeBackupCodes[backupValidation.index].codeHash,
        };
    }

    /** Verifies a TOTP code against a pending, unconfirmed secret. */
    verifySetupCode(
        encryptedPendingSecret: string,
        userId: string,
        code: string
    ): boolean {
        const pendingSecret = this.readSecret(encryptedPendingSecret, userId);

        return this.verifyCode(pendingSecret, code.trim());
    }

    /** Generates a new secret, its encrypted form bound to the user, and the otpauth URL for 2FA enrollment. */
    async setupTwoFactor(
        userId: string,
        email: string
    ): Promise<IAuthTwoFactorSetup> {
        const secret = this.generateSecret();
        const encryptedSecret = this.encryptSecret(secret, userId);
        const otpAuthUrl = this.authTwoFactorUtil.createKeyUri(email, secret);

        return {
            otpauthUrl: otpAuthUrl,
            secret,
            encryptedSecret,
        };
    }

    /** True when the user's 2FA attempt count has reached the configured maximum. */
    checkAttempt(user: IUser): boolean {
        return (user.twoFactor?.attempt ?? 0) >= this.maxAttempt;
    }
}
