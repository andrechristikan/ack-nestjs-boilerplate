import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { HelperService } from '@common/helper/services/helper.service';
import { Cache } from 'cache-manager';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { ApiKey, EnumApiKeyType } from '@prisma/client';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { IApiKeyGenerateCredential } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';

@Injectable()
export class ApiKeyUtil {
    private readonly cachePrefixKey: string;
    private readonly env: EnumAppEnvironment;
    private readonly header: string;

    constructor(
        @Inject(CacheMainProvider) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.cachePrefixKey = this.configService.get<string>(
            'auth.xApiKey.cachePrefixKey'
        );
        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.header = this.configService.get<string>('auth.xApiKey.header');
    }

    mapList(apiKeys: ApiKey[]): ApiKeyDto[] {
        return plainToInstance(ApiKeyDto, apiKeys);
    }

    mapOne(apiKey: ApiKey): ApiKeyDto {
        return plainToInstance(ApiKeyDto, apiKey);
    }

    mapCreate(apiKey: ApiKey, secret: string): ApiKeyCreateResponseDto {
        return plainToInstance(ApiKeyCreateResponseDto, { ...apiKey, secret });
    }

    async getCacheByKey(key: string): Promise<ApiKey | null> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        const cachedApiKey = await this.cacheManager.get<string>(cacheKey);
        if (cachedApiKey) {
            return JSON.parse(cachedApiKey) as ApiKey;
        }

        return null;
    }

    async setCacheByKey(key: string, apiKey: ApiKey): Promise<void> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        await this.cacheManager.set(cacheKey, JSON.stringify(apiKey));

        return;
    }

    async deleteCacheByKey(key: string): Promise<void> {
        const cacheKey = `${this.cachePrefixKey}:${key}`;
        await this.cacheManager.del(cacheKey);

        return;
    }

    createKey(key?: string): string {
        const random: string = this.helperService.randomString(25);
        return `${this.env}_${key ?? random}`;
    }

    createHash(key: string, secret: string): string {
        return this.helperService.sha256Hash(`${key}:${secret}`);
    }

    createSecret(): string {
        return this.helperService.randomString(50);
    }

    validateCredential(
        key: string,
        secret: string,
        apiKey: { hash: string }
    ): boolean {
        if (!apiKey) {
            return false;
        }

        const expectedHash = this.createHash(key, secret);
        return this.helperService.sha256Compare(expectedHash, apiKey.hash);
    }

    isExpired(
        apiKey: {
            startAt?: Date;
            endAt?: Date;
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
            startAt?: Date;
            endAt?: Date;
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

    isValid(
        apiKey: {
            startAt?: Date;
            endAt?: Date;
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

    extractKeyFromRequest(request: IRequestApp): string | undefined {
        const xApiKey: string = request.headers[
            `${this.header.toLowerCase()}`
        ] as string;

        return xApiKey;
    }

    validateType(
        apiKey: { type: EnumApiKeyType },
        allowed: EnumApiKeyType[]
    ): boolean {
        return apiKey && allowed.includes(apiKey.type);
    }

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
