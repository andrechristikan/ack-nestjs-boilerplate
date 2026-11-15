import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthTwoFactorSecretEncryptionPurpose } from '@modules/auth/constants/auth.constant';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';
import type {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorBackupCodesVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verifySync } from 'otplib';
import type { HashAlgorithm, OTPStrategy } from 'otplib';

@Injectable()
export class AuthTwoFactorUtil {
    private readonly strategy: OTPStrategy;
    private readonly algorithm: HashAlgorithm;
    private readonly issuer: string;
    private readonly digits: number;
    private readonly periodInSeconds: number;
    private readonly window: number;
    private readonly secretLength: number;
    private readonly backupCodesCount: number;
    private readonly backupCodesLength: number;
    private readonly encryptionKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService
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
        this.backupCodesCount = this.configService.get<number>(
            'auth.twoFactor.backupCodes.count'
        )!;
        this.backupCodesLength = this.configService.get<number>(
            'auth.twoFactor.backupCodes.length'
        )!;
        this.encryptionKey = this.configService.get<string>(
            'auth.twoFactor.encryption.key'
        )!;
    }

    createKeyUri(email: string, secret: string): string {
        return generateURI({
            issuer: this.issuer,
            label: email,
            secret,
            digits: this.digits,
            period: this.periodInSeconds,
            strategy: this.strategy,
            algorithm: this.algorithm,
        });
    }

    generateSecret(): string {
        return generateSecret({
            length: this.secretLength,
        });
    }

    /** Returns the matched time step, or null when the code does not match; accepts codes up to the configured window of steps old. */
    verifyCode(secret: string, code: string): number | null {
        const verified = verifySync({
            token: code,
            secret,
            algorithm: this.algorithm,
            strategy: this.strategy,
            digits: this.digits,
            period: this.periodInSeconds,
            epochTolerance: [this.window * this.periodInSeconds, 0],
        });

        if (!verified.valid || !('timeStep' in verified)) {
            return null;
        }

        return verified.timeStep;
    }

    async generateBackupCodes(): Promise<IAuthTwoFactorBackupCodes> {
        const codes = Array.from({ length: this.backupCodesCount }, () =>
            this.helperStringService.randomUppercase(this.backupCodesLength)
        );
        const hashes: string[] = [];

        // Sequential by design: argon2id hashes hold helper.argon2 memory per call, one at a time
        for (const code of codes) {
            const hash = await this.helperHashService.argon2Hash(code);
            hashes.push(hash);
        }

        return { codes, hashes };
    }

    /** Compares the input with each stored argon2id hash in turn, stopping at the first match; index is -1 when none matches. */
    async verifyBackupCode(
        backupCodes: string[],
        input: string
    ): Promise<IAuthTwoFactorBackupCodesVerifyResult> {
        // Sequential by design: argon2id compares hold helper.argon2 memory per call, one at a time, stopping at the first match
        for (const [index, hash] of backupCodes.entries()) {
            const isMatch = await this.helperHashService.argon2Compare(
                input,
                hash
            );
            if (isMatch) {
                return { isValid: true, index };
            }
        }

        return { isValid: false, index: -1 };
    }

    encryptSecret(secret: string, userId: string): string {
        return this.helperEncryptionService.aes256Encrypt(
            secret,
            this.encryptionKey,
            AuthTwoFactorSecretEncryptionPurpose,
            userId
        );
    }

    /** Decrypts a secret encrypted for the same user id; a malformed payload or another user id throws HelperDecryptFailedException. */
    decryptSecret(encryptedSecret: string, userId: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encryptedSecret,
            this.encryptionKey,
            AuthTwoFactorSecretEncryptionPurpose,
            userId
        );
    }

    /** Maps a failed decryption to the secret-unavailable exception for the caller to throw; null for any other error. */
    toDecryptException(
        err: unknown
    ): AuthTwoFactorSecretUnavailableException | null {
        return err instanceof HelperDecryptFailedException
            ? new AuthTwoFactorSecretUnavailableException()
            : null;
    }
}
