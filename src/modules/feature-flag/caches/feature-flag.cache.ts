import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';

@Injectable()
export class FeatureFlagCache {
    private readonly keyPattern: string;
    readonly cacheTtlInMs: number;
    private readonly leaseKeyPattern: string;
    private readonly leaseTtlInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.keyPattern = this.configService.get<string>(
            'featureFlag.keyPattern'
        )!;
        this.cacheTtlInMs = this.configService.get<number>(
            'featureFlag.cacheTtlInMs'
        )!;
        this.leaseKeyPattern = this.configService.get<string>(
            'featureFlag.leaseKeyPattern'
        )!;
        this.leaseTtlInMs = this.configService.get<number>(
            'featureFlag.leaseTtlInMs'
        )!;
    }

    private buildFeatureFlagLeaseKey(key: string): string {
        return this.leaseKeyPattern.replace('{key}', () => key);
    }

    buildFeatureFlagKey(key: string): string {
        return this.keyPattern.replace('{key}', () => key);
    }

    buildFeatureFlagLease(key: string): ICacheLease {
        const leaseKey = this.buildFeatureFlagLeaseKey(key);

        return { key: leaseKey, ttlInMs: this.leaseTtlInMs };
    }

    buildFeatureFlagKeys(key: string): string[] {
        return [
            this.buildFeatureFlagKey(key),
            this.buildFeatureFlagLeaseKey(key),
        ];
    }
}
