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
import { authenticator } from 'otplib';

/**
 * Utility class for Two-Factor Authentication (2FA) operations.
 * - Generate and verify TOTP codes
 * - Manage backup codes
 * - Handle encryption/decryption of secrets
 * - Manage challenge tokens in cache
 * - Used by validation decorators and service logic
 */
@Injectable()
export class AuthTwoFactorUtil {
    private readonly issuer: string;
    private readonly digits: number;
    private readonly step: number;
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
        this.issuer = this.configService.get<string>('auth.twoFactor.issuer');
        this.digits = this.configService.get<number>('auth.twoFactor.digits');
        this.step = this.configService.get<number>('auth.twoFactor.step');
        this.window = this.configService.get<number>('auth.twoFactor.window');
        this.secretLength = this.configService.get<number>(
            'auth.twoFactor.secretLength'
        );
        this.challengeTtlInMs = this.configService.get<number>(
            'auth.twoFactor.challengeTtlInMs'
        );
        this.cachePrefixKey = this.configService.get<string>(
            'auth.twoFactor.cachePrefixKey'
        );
        this.backupCodesCount = this.configService.get<number>(
            'auth.twoFactor.backupCodes.count'
        );
        this.backupCodesLength = this.configService.get<number>(
            'auth.twoFactor.backupCodes.length'
        );
        this.encryptionKey = this.configService.get<string>(
            'auth.twoFactor.encryption.key'
        );
        this.maxAttempt = this.configService.get<number>(
            'auth.twoFactor.maxAttempt'
        );
        this.lockAttemptDuration = this.configService.get<number>(
            'auth.twoFactor.lockAttemptDuration'
        );

        authenticator.options = {
            step: this.step,
            digits: this.digits,
            window: this.window,
        };
    }

    /**
     * Generate a new TOTP secret for 2FA setup
     * @returns {string} Secret string
     */
    generateSecret(): string {
        return authenticator.generateSecret(this.secretLength);
    }

    /**
     * Create a key URI for authenticator apps (QR code)
     * @param email User email
     * @param secret TOTP secret
     * @returns Key URI
     */
    createKeyUri(email: string, secret: string): string {
        return authenticator.keyuri(email, this.issuer, secret);
    }

    /**
     * Verify TOTP code against secret
     * @param secret TOTP secret
     * @param code Code to verify
     * @returns True if valid
     */
    verifyCode(secret: string, code: string): boolean {
        return authenticator.check(code, secret);
    }

    /**
     * Generate IV for AES encryption
     * @returns IV string
     */
    generateEncryptionIv(): string {
        // Store as a tagged string so we can safely parse/extend formats later.
        return `hex:${randomBytes(16).toString('hex')}`;
    }

    /**
     * Encrypt secret using AES-256
     * @param secret Secret to encrypt
     * @param iv Initialization vector
     * @returns Encrypted secret
     */
    encryptSecret(secret: string, iv: string): string {
        return this.helperService.aes256Encrypt(secret, this.encryptionKey, iv);
    }

    /**
     * Decrypt secret using AES-256
     * @param secret Encrypted secret
     * @param iv Initialization vector
     * @returns Decrypted secret
     */
    decryptSecret(secret: string, iv: string): string {
        return this.helperService.aes256Decrypt(secret, this.encryptionKey, iv);
    }

    /**
     * Generate backup codes for 2FA recovery
     * @returns Backup codes and hashes
     */
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

    /**
     * Verify backup code against stored hashes
     * @param backupCodes Array of hashed backup codes
     * @param input Input code to verify
     * @returns Verification result
     */
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

    /**
     * Create a challenge token for 2FA verification
     * @param cachePayload Challenge payload
     * @returns ChallengeToken and expiry
     */
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

    /**
     * Get challenge payload from cache by token
     * @param token Challenge token
     * @returns Challenge payload or null
     */
    async getChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        const key = `${this.cachePrefixKey}:${token}`;
        const cached =
            await this.cacheManager.get<IAuthTwoFactorChallengeCache>(key);

        return cached ?? null;
    }

    /**
     * Remove challenge token from cache
     * @param token Challenge token
     */
    async clearChallenge(token: string): Promise<void> {
        const key = `${this.cachePrefixKey}:${token}`;
        await this.cacheManager.del(key);
    }

    /**
     * Validate TOTP code format (only digits)
     * @param code Code to validate
     * @returns True if valid format
     */
    validateCode(code: string): boolean {
        const rgx = new RegExp(`^\d{${this.digits}}$`);
        return rgx.test(code);
    }

    /**
     * Validate backup code format (A-Z, 0-9)
     * @param code Code to validate
     * @returns True if valid format
     */
    validateBackupCode(code: string): boolean {
        const rgx = new RegExp(`^[A-Z0-9]{${this.backupCodesLength}}$`);
        return rgx.test(code);
    }

    /**
     * Verifies two-factor authentication (2FA) for a user using TOTP or backup code.
     *
     * - If method is 'code', decrypts the secret and verifies the TOTP code.
     * - If method is 'backupCode', checks the backup code against stored hashes and removes it if valid.
     *
     * @param twoFactor TwoFactor entity containing secret, IV, and backup codes
     * @param verifyData Object containing method, code, and backupCode
     * @param verifyData.method EnumAuthTwoFactorMethod ('code' or 'backupCode')
     * @param verifyData.code TOTP code to verify (if method is 'code')
     * @param verifyData.backupCode Backup code to verify (if method is 'backupCode')
     * @returns Verification result: isValid, method, and optionally newBackupCodes if backup code is used
     */
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
                method,
            };
        } else if (
            method === EnumAuthTwoFactorMethod.backupCodes &&
            twoFactor.backupCodes.length === 0
        ) {
            return {
                isValid: false,
                method,
            };
        }

        if (method === EnumAuthTwoFactorMethod.code) {
            const secret = this.decryptSecret(twoFactor.secret, twoFactor.iv);
            const isValidCode = this.verifyCode(secret, normalizedCode);
            if (!isValidCode) {
                return {
                    isValid: false,
                    method,
                };
            }

            return {
                isValid: true,
                method,
            };
        }

        const backupValidation = this.verifyBackupCode(
            twoFactor.backupCodes,
            normalizedCode
        );
        if (!backupValidation.isValid) {
            return {
                isValid: false,
                method,
            };
        }

        const updatedTwoFactorBackupCodes = [...twoFactor.backupCodes];
        updatedTwoFactorBackupCodes.splice(backupValidation.index, 1);

        return {
            isValid: true,
            method,
            newBackupCodes: updatedTwoFactorBackupCodes,
        };
    }

    /**
     * Sets up two-factor authentication (2FA) for a user by generating a secret and otpauth URL.
     *
     * @param email - The email address of the user for whom 2FA is being set up.
     * @returns An object containing the otpauth URL, secret, encrypted secret, and IV for 2FA setup.
     */
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

    /**
     * Checks if the user's 2FA attempt count has reached the maximum allowed attempts.
     *
     * @param user - The user to check 2FA attempts for
     * @returns True if attempts >= maxAttempt, otherwise false
     */
    checkAttempt(user: IUser): boolean {
        return user.twoFactor.attempt >= this.maxAttempt;
    }

    /**
     * Locks the user's two-factor authentication (2FA) attempts by setting a lock flag in cache with exponential backoff TTL.
     *
     * - The lock is stored in cache with a key based on the user ID.
     * - TTL (time to live) is calculated using the formula:
     *   TTL = 2^(attempt / maxAttempt) * lockAttemptDuration
     * - lockAttemptDuration can be configured (e.g., 2 minutes = 120000 ms) to set the minimum hold time.
     * - TTL increases exponentially as the attempt count grows, so the user must wait longer for each failed attempt.
     * - Used to prevent brute-force attacks on 2FA verification.
     *
     * @param user - The user whose 2FA attempts should be locked
     * @returns Promise<void>
     */
    async lockTwoFactorAttempt(user: IUser): Promise<void> {
        const key = `${this.cachePrefixKey}:lock:${user.id}`;
        const ttlExponentialInMs =
            Math.pow(2, user.twoFactor.attempt / this.maxAttempt) *
            this.lockAttemptDuration;
        await this.cacheManager.set<boolean>(key, true, ttlExponentialInMs);

        return;
    }

    /**
     * Retrieves the remaining lock duration (in milliseconds) for a user's two-factor authentication (2FA) attempts.
     *
     * - Checks if the user is currently locked out from 2FA attempts by looking up the lock key in cache.
     * - If locked, returns the remaining TTL (time to live) in milliseconds until the user can retry.
     * - If not locked, returns 0.
     *
     * @param user - The user whose 2FA lock status is being checked
     * @returns Promise<number> Remaining lock duration in milliseconds, or 0 if not locked
     */
    async getLockTwoFactorAttempt(user: IUser): Promise<number> {
        const key = `${this.cachePrefixKey}:lock:${user.id}`;
        const isLocked = await this.cacheManager.get<boolean>(key);
        const retryAfterMs = await this.cacheManager.ttl(key);

        return isLocked ? retryAfterMs : 0;
    }
}
