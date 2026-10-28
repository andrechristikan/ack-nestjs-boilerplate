import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumAnalyticAnomalySignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
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

        it('returns null when the store has no value', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getDashboard('metric', 'start', 'end');

            expect(result).toBeNull();
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
                EnumAnalyticAnomalySignal.impossibleTravel,
                '3600000'
            );

            expect(result).toEqual({ count: 2 });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Anomaly:{signal}:{window}',
                {
                    signal: EnumAnalyticAnomalySignal.impossibleTravel,
                    window: '3600000',
                }
            );
        });

        it('returns null when the store has no value', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getAnomalySummary(
                EnumAnalyticAnomalySignal.impossibleTravel,
                '3600000'
            );

            expect(result).toBeNull();
        });
    });

    describe('setAnomalySummary', () => {
        it('writes the anomaly summary with the anomaly ttl', async () => {
            await cache.setAnomalySummary(
                EnumAnalyticAnomalySignal.impossibleTravel,
                '3600000',
                {
                    count: 2,
                }
            );

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
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000'
            );

            expect(result).toEqual({ count: 6 });
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Fraud:{signal}:{window}',
                {
                    signal: EnumAnalyticFraudSignal.credentialStuffing,
                    window: '86400000',
                }
            );
        });

        it('returns null when the store has no value', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getFraudSummary(
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000'
            );

            expect(result).toBeNull();
        });
    });

    describe('setFraudSummary', () => {
        it('writes the fraud summary with the fraud ttl', async () => {
            await cache.setFraudSummary(
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000',
                {
                    count: 6,
                }
            );

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

        it('returns null when the store has no value', async () => {
            cacheManager.get.mockResolvedValue(undefined);

            const result = await cache.getRiskScore('user-1');

            expect(result).toBeNull();
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

    describe('read failures', () => {
        it('getDashboard returns null when the store read throws', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.getDashboard('metric', 'a', 'b')
            ).resolves.toBeNull();
        });

        it('getAnomalySummary returns null when the store read throws', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.getAnomalySummary(
                    EnumAnalyticAnomalySignal.impossibleTravel,
                    'window'
                )
            ).resolves.toBeNull();
        });

        it('getFraudSummary returns null when the store read throws', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.getFraudSummary(
                    EnumAnalyticFraudSignal.credentialStuffing,
                    'window'
                )
            ).resolves.toBeNull();
        });

        it('getRiskScore returns null when the store read throws', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.get.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(cache.getRiskScore('user-1')).resolves.toBeNull();
        });
    });

    describe('write failures', () => {
        it('setDashboard swallows a thrown store write', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.setDashboard('metric', 'a', 'b', 1)
            ).resolves.toBeUndefined();
        });

        it('setAnomalySummary swallows a thrown store write', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.setAnomalySummary(
                    EnumAnalyticAnomalySignal.impossibleTravel,
                    'window',
                    1
                )
            ).resolves.toBeUndefined();
        });

        it('setFraudSummary swallows a thrown store write', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.setFraudSummary(
                    EnumAnalyticFraudSignal.credentialStuffing,
                    'window',
                    1
                )
            ).resolves.toBeUndefined();
        });

        it('setRiskScore swallows a thrown store write', async () => {
            helperStringService.fillPattern.mockReturnValue('cache-key');
            cacheManager.set.mockImplementation(() => {
                throw new Error('redis down');
            });

            await expect(
                cache.setRiskScore('user-1', 1)
            ).resolves.toBeUndefined();
        });
    });
});
