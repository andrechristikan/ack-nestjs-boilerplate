import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { TwoFactor } from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorBackupCodesVerifyResult,
    IAuthTwoFactorSetup,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IAuthTwoFactorService } from '@modules/auth/interfaces/auth.two-factor.service.interface';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { HashAlgorithm, OTPStrategy, generateSecret, verifySync } from 'otplib';

/** 2FA domain service: TOTP codes, backup codes, AES secret encryption, and attempt policy. */
@Injectable()
export class AuthTwoFactorService implements IAuthTwoFactorService {
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
        private readonly authTwoFactorUtil: AuthTwoFactorUtil
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

    generateEncryptionIv(): string {
        // Tagged with its encoding so the format is identifiable on read.
        return `hex:${randomBytes(16).toString('hex')}`;
    }

    /** Encrypts the TOTP secret with AES-256 before persistence. */
    encryptSecret(secret: string, iv: string): string {
        return this.helperEncryptionService.aes256Encrypt(
            secret,
            this.encryptionKey,
            iv
        );
    }

    /** Decrypts the stored AES-256 TOTP secret. */
    decryptSecret(secret: string, iv: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            secret,
            this.encryptionKey,
            iv
        );
    }

    /** Generates recovery backup codes plus their SHA-256 hashes for storage. */
    generateBackupCodes(): IAuthTwoFactorBackupCodes {
        const codes = Array.from({ length: this.backupCodesCount }, () =>
            this.helperStringService
                .random(this.backupCodesLength)
                .toUpperCase()
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
        const otpAuthUrl = this.authTwoFactorUtil.createKeyUri(email, secret);

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
}
