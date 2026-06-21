import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperService } from '@common/helper/services/helper.service';
import { TwoFactor } from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorBackupCodesVerifyResult,
    IAuthTwoFactorChallenge,
    IAuthTwoFactorChallengeCache,
    IAuthTwoFactorSetup,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
    HashAlgorithm,
    OTPStrategy,
    generateSecret,
    generateURI,
    verifySync,
} from 'otplib';

/** 2FA utility: TOTP codes, backup codes, AES secret encryption, challenge tokens, and attempt locking. */
@Injectable()
export class AuthTwoFactorUtil {
    private readonly strategy: OTPStrategy;
    private readonly algorithm: HashAlgorithm;
    private readonly issuer: string;
    private readonly digits: number;
    private readonly periodInSeconds: number;
    private readonly window: number;
    private readonly secretLength: number;
    private readonly challengeTtlInMs: number;
    private readonly cachePrefixKey: string;
    private readonly backupCodesCount: number;
    private readonly backupCodesLength: number;
    private readonly encryptionKey: string;
    private readonly maxAttempt: number;
    private readonly lockAttemptDuration: number;

    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.strategy = this.configService.get<OTPStrategy>(
            'auth.twoFactor.strategy'
        )!;
        this.algorithm = this.configService.get<HashAlgorithm>(
            'auth.twoFactor.algorithm'
        )!;
        this.issuer = this.configService.get<string>('auth.twoFactor.issuer')!;
        this.digits = this.configService.get<number>('auth.twoFactor.digits')!;
        this.periodInSeconds = this.configService.get<number>(
            'auth.twoFactor.periodInSeconds'
        )!;
        this.window = this.configService.get<number>('auth.twoFactor.window')!;
        this.secretLength = this.configService.get<number>(
            'auth.twoFactor.secretLength'
        )!;
        this.challengeTtlInMs = this.configService.get<number>(
            'auth.twoFactor.challengeTtlInMs'
        )!;
        this.cachePrefixKey = this.configService.get<string>(
            'auth.twoFactor.cachePrefixKey'
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
        this.lockAttemptDuration = this.configService.get<number>(
            'auth.twoFactor.lockAttemptDuration'
        )!;
    }

    generateSecret(): string {
        return generateSecret({
            length: this.secretLength,
        });
    }

    /** Builds the otpauth key URI consumed by authenticator apps (QR code). */
    createKeyUri(email: string, secret: string): string {
        return generateURI({
            issuer: this.issuer,
            label: `${this.issuer}:${email}`,
            secret,
            digits: this.digits,
            period: this.periodInSeconds,
            strategy: this.strategy,
            algorithm: this.algorithm,
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

    generateEncryptionIv(): string {
        // Store as a tagged string so we can safely parse/extend formats later.
        return `hex:${randomBytes(16).toString('hex')}`;
    }

    /** Encrypts the TOTP secret with AES-256 before persistence. */
    encryptSecret(secret: string, iv: string): string {
        return this.helperService.aes256Encrypt(secret, this.encryptionKey, iv);
    }

    /** Decrypts the stored AES-256 TOTP secret. */
    decryptSecret(secret: string, iv: string): string {
        return this.helperService.aes256Decrypt(secret, this.encryptionKey, iv);
    }

    /** Generates recovery backup codes plus their SHA-256 hashes for storage. */
    generateBackupCodes(): IAuthTwoFactorBackupCodes {
        const codes = Array.from({ length: this.backupCodesCount }, () =>
            this.helperService
                .randomString(this.backupCodesLength)
                .toUpperCase()
        );

        return {
            codes,
            hashes: codes.map(code => this.helperService.sha256Hash(code)),
        };
    }

    /** Matches an input code against stored hashes, returning the matched index. */
    verifyBackupCode(
        backupCodes: string[],
        input: string
    ): IAuthTwoFactorBackupCodesVerifyResult {
        const codeHash = this.helperService.sha256Hash(input);
        const index = backupCodes.findIndex(hash =>
            this.helperService.sha256Compare(hash, codeHash)
        );

        return {
            isValid: index > -1,
            index,
        };
    }

    /** Stores the challenge payload in cache under a random token with a TTL. */
    async createChallenge(
        cachePayload: IAuthTwoFactorChallengeCache
    ): Promise<IAuthTwoFactorChallenge> {
        const challengeToken = this.helperService.randomString(48);
        const key = `${this.cachePrefixKey}:${challengeToken}`;
        await this.cacheManager.set<IAuthTwoFactorChallengeCache>(
            key,
            cachePayload,
            this.challengeTtlInMs
        );

        return { challengeToken, expiresInMs: this.challengeTtlInMs };
    }

    async getChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const key = `${this.cachePrefixKey}:${token}`;
        const cached =
            await this.cacheManager.get<IAuthTwoFactorChallengeCache>(key);

        return cached ?? null;
    }

    async clearChallenge(token: string): Promise<void> {
        const key = `${this.cachePrefixKey}:${token}`;
        await this.cacheManager.del(key);
    }

    /** Validates the TOTP code format (digits only, configured length). */
    validateCode(code: string): boolean {
        const rgx = new RegExp(`^\d{${this.digits}}$`);
        return rgx.test(code);
    }

    /** Validates the backup code format (A-Z, 0-9, configured length). */
    validateBackupCode(code: string): boolean {
        const rgx = new RegExp(`^[A-Z0-9]{${this.backupCodesLength}}$`);
        return rgx.test(code);
    }

    /** Verifies a TOTP or backup code; a consumed backup code is returned removed in newBackupCodes. */
    async verifyTwoFactor(
        twoFactor: TwoFactor,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        const normalizedCode =
            method === EnumAuthTwoFactorMethod.code
                ? code?.trim()
                : backupCode?.trim();
        if (!twoFactor.secret || !twoFactor.iv || !normalizedCode) {
            return {
                isValid: false,
                method: method!,
            };
        } else if (
            method === EnumAuthTwoFactorMethod.backupCodes &&
            twoFactor.backupCodes.length === 0
        ) {
            return {
                isValid: false,
                method: method!,
            };
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.decryptSecret(twoFactor.secret, twoFactor.iv);
            const isValidCode = this.verifyCode(secret, normalizedCode);
            if (!isValidCode) {
                return {
                    isValid: false,
                    method: method!,
                };
            }

            return {
                isValid: true,
                method: method!,
            };
        }

        const backupValidation = this.verifyBackupCode(
            twoFactor.backupCodes,
            normalizedCode
        );
        if (!backupValidation.isValid) {
            return {
                isValid: false,
                method: method!,
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

    /** Generates a new secret, its encrypted form, IV, and the otpauth URL for 2FA enrollment. */
    async setupTwoFactor(email: string): Promise<IAuthTwoFactorSetup> {
        const secret = this.generateSecret();
        const iv = this.generateEncryptionIv();
        const encryptedSecret = this.encryptSecret(secret, iv);
        const otpAuthUrl = this.createKeyUri(email, secret);

        return {
            otpauthUrl: otpAuthUrl,
            secret,
            encryptedSecret,
            iv,
        };
    }

    /** True when the user's 2FA attempt count has reached the configured maximum. */
    checkAttempt(user: IUser): boolean {
        return (user.twoFactor?.attempt ?? 0) >= this.maxAttempt;
    }

    /** Locks 2FA in cache with exponential backoff TTL `2^(attempt/maxAttempt) * lockAttemptDuration` to throttle brute force. */
    async lockTwoFactorAttempt(user: IUser): Promise<void> {
        const key = `${this.cachePrefixKey}:lock:${user.id}`;
        const ttlExponentialInMs =
            Math.pow(2, (user.twoFactor?.attempt ?? 0) / this.maxAttempt) *
            this.lockAttemptDuration;
        await this.cacheManager.set<boolean>(key, true, ttlExponentialInMs);

        return;
    }

    /** Returns the remaining 2FA lock duration in ms, or 0 when not locked. */
    async getLockTwoFactorAttempt(user: IUser): Promise<number> {
        const key = `${this.cachePrefixKey}:lock:${user.id}`;
        const isLocked = await this.cacheManager.get<boolean>(key);
        const retryAfterMs = await this.cacheManager.ttl(key);

        return isLocked ? (retryAfterMs ?? 0) : 0;
    }
}
