import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';

@Injectable()
export class ApiKeyCache {
    private readonly keyPattern: string;
    readonly cacheTtlInMs: number;
    private readonly leaseKeyPattern: string;
    private readonly leaseTtlInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.keyPattern = this.configService.get<string>(
            'auth.xApiKey.keyPattern'
        )!;
        this.cacheTtlInMs = this.configService.get<number>(
            'auth.xApiKey.cacheTtlInMs'
        )!;
        this.leaseKeyPattern = this.configService.get<string>(
            'auth.xApiKey.leaseKeyPattern'
        )!;
        this.leaseTtlInMs = this.configService.get<number>(
            'auth.xApiKey.leaseTtlInMs'
        )!;
    }

    private buildApiKeyLeaseKey(key: string): string {
        return this.leaseKeyPattern.replace('{key}', () => key);
    }

    buildApiKeyKey(key: string): string {
        return this.keyPattern.replace('{key}', () => key);
    }

    buildApiKeyLease(key: string): ICacheLease {
        const leaseKey = this.buildApiKeyLeaseKey(key);

        return { key: leaseKey, ttlInMs: this.leaseTtlInMs };
    }

    buildApiKeyKeys(key: string): string[] {
        return [this.buildApiKeyKey(key), this.buildApiKeyLeaseKey(key)];
    }
}
