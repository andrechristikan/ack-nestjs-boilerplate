import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Cache } from 'cache-manager';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { ApiKey, EnumApiKeyType } from '@generated/prisma-client';
import {
    IApiKeyCreated,
    IApiKeyGenerateCredential,
} from '@modules/api-key/interfaces/api-key.interface';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';

@Injectable()
export class ApiKeyUtil {
    private readonly keyPattern: string;
    private readonly env: EnumAppEnvironment;
    private readonly header: string;

    constructor(
        @Inject(CacheMainProvider) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService
    ) {
        this.keyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.header = this.configService.get<string>('auth.xApiKey.header')!;
    }

    mapCreate(apiKey: ApiKey, secret: string): IApiKeyCreated {
        return {
            ...apiKey,
            secret,
        };
    }

    async getCacheByKey(key: string): Promise<ApiKey | null> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        const cachedApiKey = await this.cacheManager.get<ApiKey>(cacheKey);
        if (cachedApiKey) {
            return cachedApiKey;
        }

        return null;
    }

    async setCacheByKey(key: string, apiKey: ApiKey): Promise<void> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        await this.cacheManager.set(cacheKey, apiKey);
        return;
    }

    async deleteCacheByKey(key: string): Promise<void> {
        const cacheKey = this.keyPattern.replace('{key}', key);
        await this.cacheManager.del(cacheKey);
        return;
    }

    /**
     * Builds a public key prefixed with the current environment for traceability.
     */
    createKey(key?: string): string {
        const random: string = this.helperStringService.random(25);
        return `${this.env}_${key ?? random}`;
    }

    /**
     * Derives the SHA-256 hash stored for credential verification.
     */
    createHash(key: string, secret: string): string {
        return this.helperHashService.sha256Hash(`${key}:${secret}`);
    }

    createSecret(): string {
        return this.helperStringService.random(50);
    }

    /**
     * Verifies the supplied key/secret by re-deriving the hash and comparing it to the stored one.
     */
    validateCredential(
        key: string,
        secret: string,
        apiKey: { hash: string }
    ): boolean {
        if (!apiKey) {
            return false;
        }

        const expectedHash = this.createHash(key, secret);
        return this.helperHashService.sha256Compare(expectedHash, apiKey.hash);
    }

    isExpired(
        apiKey: {
            startAt?: Date | null;
            endAt?: Date | null;
        },
        currentDate: Date
    ): boolean {
        if (apiKey.startAt && apiKey.endAt) {
            return currentDate > apiKey.endAt;
        }

        return false;
    }

    isNotYetActive(
        apiKey: {
            startAt?: Date | null;
            endAt?: Date | null;
        },
        currentDate: Date
    ): boolean {
        if (apiKey.startAt && apiKey.endAt) {
            return currentDate < apiKey.startAt;
        }

        return false;
    }

    isActive(apiKey: { isActive: boolean }): boolean {
        return apiKey.isActive;
    }

    /**
     * True when the key is active, not expired, and already within its start date.
     */
    isValid(
        apiKey: {
            startAt?: Date | null;
            endAt?: Date | null;
            isActive: boolean;
        },
        currentDate: Date
    ): boolean {
        return (
            apiKey &&
            apiKey.isActive &&
            !this.isExpired(apiKey, currentDate) &&
            !this.isNotYetActive(apiKey, currentDate)
        );
    }

    extractKeyFromRequest(request: IRequestApp): string {
        const xApiKey: string = request.headers[
            `${this.header.toLowerCase()}`
        ] as string;

        return xApiKey ?? '';
    }

    validateType(
        apiKey: { type: EnumApiKeyType },
        allowed: EnumApiKeyType[]
    ): boolean {
        return apiKey && allowed.includes(apiKey.type);
    }

    /**
     * Generates a fresh key/secret pair plus the hash to persist.
     */
    generateCredential(key?: string): IApiKeyGenerateCredential {
        key = key ?? this.createKey();
        const secret = this.createSecret();
        const hash: string = this.createHash(key, secret);

        return { key, secret, hash };
    }

    mapActivityLogMetadata(apiKey: ApiKey): IActivityLogMetadata {
        return {
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            apiKeyType: apiKey.type,
            timestamp: apiKey.updatedAt ?? apiKey.createdAt,
        };
    }
}
