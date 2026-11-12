import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';

@Injectable()
export class FeatureFlagCache {
    private readonly featureFlagKeyPattern: string;
    readonly featureFlagTtlInMs: number;
    private readonly featureFlagLeaseKeyPattern: string;
    private readonly featureFlagLeaseTtlInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.featureFlagKeyPattern = this.configService.get<string>(
            'featureFlag.keyPattern'
        )!;
        this.featureFlagTtlInMs = this.configService.get<number>(
            'featureFlag.cacheTtlInMs'
        )!;
        this.featureFlagLeaseKeyPattern = this.configService.get<string>(
            'featureFlag.leaseKeyPattern'
        )!;
        this.featureFlagLeaseTtlInMs = this.configService.get<number>(
            'featureFlag.leaseTtlInMs'
        )!;
    }

    private buildFeatureFlagLeaseKey(key: string): string {
        return this.featureFlagLeaseKeyPattern.replace('{key}', () => key);
    }

    buildFeatureFlagKey(key: string): string {
        return this.featureFlagKeyPattern.replace('{key}', () => key);
    }

    buildFeatureFlagLease(key: string): ICacheLease {
        const leaseKey = this.buildFeatureFlagLeaseKey(key);

        return { key: leaseKey, ttlInMs: this.featureFlagLeaseTtlInMs };
    }

    /** The entry key and its lease key. */
    buildFeatureFlagKeys(key: string): string[] {
        return [
            this.buildFeatureFlagKey(key),
            this.buildFeatureFlagLeaseKey(key),
        ];
    }
}
