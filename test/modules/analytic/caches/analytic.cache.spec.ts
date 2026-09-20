import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';

describe('AnalyticCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: AnalyticCache;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'analytic.cache.keyPatterns.dashboard':
                    'Dashboard:{metric}:{start}:{end}',
                'analytic.cache.keyPatterns.anomaly':
                    'Anomaly:{signal}:{window}',
                'analytic.cache.keyPatterns.fraud': 'Fraud:{signal}:{window}',
                'analytic.cache.keyPatterns.riskScore': 'RiskScore:{userId}',
                'analytic.cache.dashboardTtlInMs': 1000,
                'analytic.cache.anomalySummaryTtlInMs': 2000,
                'analytic.cache.fraudSummaryTtlInMs': 3000,
                'analytic.cache.riskScoreTtlInMs': 4000,
            };
            return values[key];
        });
        helperStringService.fillPattern.mockImplementation((_pattern, tokens) =>
            Object.values(tokens).join(':')
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        cache = module.get(AnalyticCache);
    });

    describe('getDashboard', () => {
        it('returns the cached dashboard value', async () => {
            cacheManager.get.mockResolvedValue({ count: 4 });

            const result = await cache.getDashboard<{ count: number }>(
                'users.registrations',
                'start',
                'end'
            );

            expect(result).toEqual({ count: 4 });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Dashboard:{metric}:{start}:{end}',
                {
                    metric: 'users.registrations',
                    start: 'start',
                    end: 'end',
                }
            );
        });
    });

    describe('setDashboard', () => {
        it('writes the dashboard value with the dashboard ttl', async () => {
            await cache.setDashboard('users.registrations', 'start', 'end', {
                count: 4,
            });

            expect(cacheManager.set).toHaveBeenCalledWith(
                'users.registrations:start:end',
                { count: 4 },
                1000
            );
        });
    });

    describe('getAnomalySummary', () => {
        it('returns the cached anomaly summary', async () => {
            cacheManager.get.mockResolvedValue({ count: 2 });

            const result = await cache.getAnomalySummary<{ count: number }>(
                'impossible-travel',
                '3600000'
            );

            expect(result).toEqual({ count: 2 });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Anomaly:{signal}:{window}',
                { signal: 'impossible-travel', window: '3600000' }
            );
        });
    });

    describe('setAnomalySummary', () => {
        it('writes the anomaly summary with the anomaly ttl', async () => {
            await cache.setAnomalySummary('impossible-travel', '3600000', {
                count: 2,
            });

            expect(cacheManager.set).toHaveBeenCalledWith(
                'impossible-travel:3600000',
                { count: 2 },
                2000
            );
        });
    });

    describe('getFraudSummary', () => {
        it('returns the cached fraud summary', async () => {
            cacheManager.get.mockResolvedValue({ count: 6 });

            const result = await cache.getFraudSummary<{ count: number }>(
                'credential-stuffing',
                '86400000'
            );

            expect(result).toEqual({ count: 6 });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Fraud:{signal}:{window}',
                { signal: 'credential-stuffing', window: '86400000' }
            );
        });
    });

    describe('setFraudSummary', () => {
        it('writes the fraud summary with the fraud ttl', async () => {
            await cache.setFraudSummary('credential-stuffing', '86400000', {
                count: 6,
            });

            expect(cacheManager.set).toHaveBeenCalledWith(
                'credential-stuffing:86400000',
                { count: 6 },
                3000
            );
        });
    });

    describe('getRiskScore', () => {
        it('returns the cached risk score', async () => {
            cacheManager.get.mockResolvedValue({ score: 42 });

            const result = await cache.getRiskScore<{ score: number }>(
                'user-1'
            );

            expect(result).toEqual({ score: 42 });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'RiskScore:{userId}',
                { userId: 'user-1' }
            );
        });
    });

    describe('setRiskScore', () => {
        it('writes the risk score with the risk-score ttl', async () => {
            await cache.setRiskScore('user-1', { score: 42 });

            expect(cacheManager.set).toHaveBeenCalledWith(
                'user-1',
                { score: 42 },
                4000
            );
        });
    });

    describe('buildKey', () => {
        it('fills the given pattern with the token record', () => {
            helperStringService.fillPattern.mockReturnValue('built-key');

            const result = cache['buildKey']('Pattern:{a}:{b}', {
                a: 'one',
                b: 'two',
            });

            expect(result).toBe('built-key');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Pattern:{a}:{b}',
                { a: 'one', b: 'two' }
            );
        });
    });

    describe('get', () => {
        it('returns the store value when the key is present', async () => {
            cacheManager.get.mockResolvedValue({ count: 1 });

            const result = await cache['get']<{ count: number }>('cache-key');

            expect(result).toEqual({ count: 1 });
        });

        it('returns null when the store value is undefined', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache['get']<{ count: number }>('cache-key');

            expect(result).toBeNull();
        });

        it('returns null when the store read throws', async () => {
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            const result = await cache['get']<{ count: number }>('cache-key');

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('writes the value with the given ttl', async () => {
            await cache['set']('cache-key', { count: 1 }, 500);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'cache-key',
                { count: 1 },
                500
            );
        });

        it('swallows a thrown store write', async () => {
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache['set']('cache-key', { count: 1 }, 500)
            ).resolves.toBeUndefined();
        });
    });
});
