import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagCacheSchema } from '@modules/feature-flag/constants/feature-flag.constant';

describe('FeatureFlagCache', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let cache: FeatureFlagCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'featureFlag.keyPattern': 'FeatureFlag:{key}',
                'featureFlag.cacheTtlInMs': 3600000,
                'featureFlag.leaseKeyPattern': 'FeatureFlag:Lease:{key}',
                'featureFlag.leaseTtlInMs': 10000,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagCache,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        cache = module.get(FeatureFlagCache);
    });

    describe('cacheTtlInMs', () => {
        it('reads the TTL from featureFlag.cacheTtlInMs', () => {
            expect(cache.cacheTtlInMs).toBe(3600000);
            expect(configGet).toHaveBeenCalledWith('featureFlag.cacheTtlInMs');
        });
    });

    describe('buildFeatureFlagKey', () => {
        it('builds the entry key', () => {
            expect(cache.buildFeatureFlagKey('loginWithGoogle')).toBe(
                'FeatureFlag:loginWithGoogle'
            );
        });
    });

    describe('buildFeatureFlagLease', () => {
        it('builds the lease', () => {
            expect(cache.buildFeatureFlagLease('loginWithGoogle')).toEqual({
                key: 'FeatureFlag:Lease:loginWithGoogle',
                ttlInMs: 10000,
            });
        });
    });

    describe('buildFeatureFlagKeys', () => {
        it('returns the entry and lease keys', () => {
            expect(cache.buildFeatureFlagKeys('loginWithGoogle')).toEqual([
                'FeatureFlag:loginWithGoogle',
                'FeatureFlag:Lease:loginWithGoogle',
            ]);
        });
    });

    describe('FeatureFlagCacheSchema', () => {
        it('parses a cached flag with ISO dates and null metadata', () => {
            const featureFlag: IFeatureFlag = {
                id: '507f1f77bcf86cd799439011',
                key: 'loginWithGoogle',
                description: 'Enables Google sign-in',
                isEnable: true,
                rolloutPercent: 100,
                targetUserIds: [],
                metadata: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                updatedBy: null,
            };
            const cached: unknown = {
                ...featureFlag,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z',
            };

            const result = FeatureFlagCacheSchema.parse(cached);

            expect(result).toEqual(featureFlag);
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
        });
    });
});
