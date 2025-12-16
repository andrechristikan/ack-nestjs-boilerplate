import { HelperService } from '@common/helper/services/helper.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthTwoFactorBackupCodes,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';

@Injectable()
export class AuthTwoFactorService {
    private readonly issuer: string;
    private readonly label: string;
    private readonly digits: number;
    private readonly step: number;
    private readonly window: number;
    private readonly secretLength: number;
    private readonly challengeTtlInMs: number;
    private readonly cachePrefixKey: string;
    private readonly backupCodesCount: number;
    private readonly backupCodesLength: number;
    private readonly encryptionKey?: string;
    private readonly encryptionIv?: string;

    constructor(
        @Inject(SessionCacheProvider) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.issuer = this.configService.get<string>('auth.twoFactor.issuer');
        this.label = this.configService.get<string>('auth.twoFactor.label');
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
        this.encryptionIv = this.configService.get<string>(
            'auth.twoFactor.encryption.iv'
        );

        authenticator.options = {
            step: this.step,
            digits: this.digits,
            window: this.window,
        };
    }

    generateSecret(): string {
        return authenticator.generateSecret(this.secretLength);
    }

    createKeyUri(email: string, secret: string): string {
        return authenticator.keyuri(email, this.issuer, secret);
    }

    verifyCode(secret: string, code: string): boolean {
        return authenticator.check(code, secret);
    }

    encryptSecret(secret: string): string {
        this.ensureEncryption();

        return this.helperService.aes256Encrypt(
            secret,
            this.encryptionKey,
            this.encryptionIv
        );
    }

    decryptSecret(secret: string): string {
        this.ensureEncryption();

        return this.helperService.aes256Decrypt(
            secret,
            this.encryptionKey,
            this.encryptionIv
        );
    }

    generateBackupCodes(): IAuthTwoFactorBackupCodes {
        const codes = Array.from({ length: this.backupCodesCount }, () =>
            this.helperService.randomString(this.backupCodesLength).toUpperCase()
        );

        return {
            codes,
            hashes: codes.map(code => this.helperService.sha256Hash(code)),
        };
    }

    verifyBackupCode(
        backupCodes: string[],
        input: string
    ): { isValid: boolean; index: number } {
        const codeHash = this.helperService.sha256Hash(input);
        const index = backupCodes.findIndex(hash =>
            this.helperService.sha256Compare(hash, codeHash)
        );

        return {
            isValid: index > -1,
            index,
        };
    }

    async createChallenge(
        cachePayload: IAuthTwoFactorChallengeCache
    ): Promise<{ token: string; expiresIn: number }> {
        const token = this.helperService.randomString(48);
        await this.cacheManager.set<IAuthTwoFactorChallengeCache>(
            this.buildCacheKey(token),
            cachePayload,
            this.challengeTtlInMs
        );

        return { token, expiresIn: Math.floor(this.challengeTtlInMs / 1000) };
    }

    async getChallenge(
        token: string
    ): Promise<IAuthTwoFactorChallengeCache | null> {
        return (
            (await this.cacheManager.get<IAuthTwoFactorChallengeCache>(
                this.buildCacheKey(token)
            )) ?? null
        );
    }

    async clearChallenge(token: string): Promise<void> {
        await this.cacheManager.del(this.buildCacheKey(token));
    }

    private buildCacheKey(token: string): string {
        return `${this.cachePrefixKey}:${token}`;
    }

    private ensureEncryption(): void {
        if (!this.encryptionKey || !this.encryptionIv) {
            throw new InternalServerErrorException({
                statusCode: EnumAuthStatusCodeError.twoFactorConfigMissing,
                message: 'auth.error.twoFactorConfigMissing',
            });
        }
    }
}
