import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';
import { CacheService } from '@common/cache/services/cache.service';

@Injectable()
export class ApiKeyCache {
    private readonly apiKeyKeyPattern: string;
    readonly apiKeyTtlInMs: number;
    private readonly apiKeyLeaseKeyPattern: string;
    private readonly apiKeyLeaseTtlInMs: number;

    constructor(
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService
    ) {
        this.apiKeyKeyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
        this.apiKeyTtlInMs = this.configService.get<number>(
            'auth.xApiKey.cacheTtlInMs'
        )!;
        this.apiKeyLeaseKeyPattern = this.configService.get<string>(
            'auth.xApiKey.leaseKeyPattern'
        )!;
        this.apiKeyLeaseTtlInMs = this.configService.get<number>(
            'auth.xApiKey.leaseTtlInMs'
        )!;
    }

    private buildApiKeyLeaseKey(key: string): string {
        return this.apiKeyLeaseKeyPattern.replace('{key}', () => key);
    }

    buildApiKeyKey(key: string): string {
        return this.apiKeyKeyPattern.replace('{key}', () => key);
    }

    buildApiKeyLease(key: string): ICacheLease {
        const leaseKey = this.buildApiKeyLeaseKey(key);

        return { key: leaseKey, ttlInMs: this.apiKeyLeaseTtlInMs };
    }

    /** The entry key and its lease key. */
    buildApiKeyKeys(key: string): string[] {
        return [this.buildApiKeyKey(key), this.buildApiKeyLeaseKey(key)];
    }

    /** Deletes the entry and its lease; a connection error throws RedisUnavailableException. */
    async deleteApiKey(key: string): Promise<void> {
        const keys = this.buildApiKeyKeys(key);
        await this.cacheService.invalidate(keys);
    }
}
