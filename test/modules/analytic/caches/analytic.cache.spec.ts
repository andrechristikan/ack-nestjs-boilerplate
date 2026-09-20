import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { ConfigService } from '@nestjs/config';

describe('AnalyticCache', () => {
    const cacheManager = createMock<Cache>();
    const configService = createMock<ConfigService>();
    const helperStringService = new HelperStringService();
    const config = new Map<string, string | number>([
        [
            'analytic.cache.keyPatterns.dashboard',
            'dashboard:{metric}:{start}:{end}',
        ],
        ['analytic.cache.keyPatterns.anomaly', 'anomaly:{signal}:{window}'],
        ['analytic.cache.keyPatterns.fraud', 'fraud:{signal}:{window}'],
        ['analytic.cache.keyPatterns.riskScore', 'risk:{userId}'],
        ['analytic.cache.dashboardTtlInMs', 1000],
        ['analytic.cache.anomalySummaryTtlInMs', 2000],
        ['analytic.cache.fraudSummaryTtlInMs', 3000],
        ['analytic.cache.riskScoreTtlInMs', 4000],
    ]);

    let cache: AnalyticCache;

    beforeEach(async () => {
        vi.resetAllMocks();
        configService.get.mockImplementation(key => config.get(key));
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        cache = moduleRef.get(AnalyticCache);
    });

    it.each([
        [
            'dashboard',
            () => cache.getDashboard('users', 'a', 'b'),
            'dashboard:users:a:b',
        ],
        [
            'anomaly',
            () => cache.getAnomalySummary('travel', '60'),
            'anomaly:travel:60',
        ],
        ['fraud', () => cache.getFraudSummary('burst', '30'), 'fraud:burst:30'],
        ['risk', () => cache.getRiskScore('user-id'), 'risk:user-id'],
    ])('reads the %s cache key', async (_name, read, key) => {
        cacheManager.get.mockResolvedValue({ value: 1 });
        await expect(read()).resolves.toEqual({ value: 1 });
        expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it.each([
        [
            'dashboard',
            () => cache.setDashboard('users', 'a', 'b', 1),
            'dashboard:users:a:b',
            1000,
        ],
        [
            'anomaly',
            () => cache.setAnomalySummary('travel', '60', 1),
            'anomaly:travel:60',
            2000,
        ],
        [
            'fraud',
            () => cache.setFraudSummary('burst', '30', 1),
            'fraud:burst:30',
            3000,
        ],
        ['risk', () => cache.setRiskScore('user-id', 1), 'risk:user-id', 4000],
    ])(
        'writes the %s cache key with its ttl',
        async (_name, write, key, ttl) => {
            await write();
            expect(cacheManager.set).toHaveBeenCalledWith(key, 1, ttl);
        }
    );

    it('normalizes a missing cache value to null', async () => {
        cacheManager.get.mockResolvedValue(undefined);
        await expect(cache.getRiskScore('user-id')).resolves.toBeNull();
    });

    it('fails open when a cache read fails', async () => {
        cacheManager.get.mockRejectedValue(new Error('cache unavailable'));
        await expect(cache.getRiskScore('user-id')).resolves.toBeNull();
    });

    it('swallows a cache write failure', async () => {
        cacheManager.set.mockRejectedValue(new Error('cache unavailable'));
        await expect(cache.setRiskScore('user-id', 1)).resolves.toBeUndefined();
    });
});
