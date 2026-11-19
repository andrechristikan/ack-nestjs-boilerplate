import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticApiKeyActiveExpiredCacheSchema } from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticApiKeyRepository } from '@modules/analytic/repositories/analytic.api-key.repository';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';

describe('AnalyticApiKeyService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const analyticApiKeyRepository: MockProxy<AnalyticApiKeyRepository> =
        mock<AnalyticApiKeyRepository>();

    const now: Date = new Date('2026-03-01T00:00:00.000Z');

    let service: AnalyticApiKeyService;

    beforeEach(async () => {
        vi.resetAllMocks();

        analyticDateUtil.cacheToken.mockImplementation((date: Date | null) =>
            date ? date.toISOString() : '_'
        );
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) => `${metric}:${start}:${end}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticApiKeyService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: AnalyticApiKeyRepository,
                    useValue: analyticApiKeyRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticApiKeyService);
    });

    describe('apiKeysActiveExpired', () => {
        it('returns the repository counts for the current time', async () => {
            const counts = { active: 3, expired: 1, inactive: 2 };
            analyticApiKeyRepository.findActiveExpired.mockResolvedValue(
                counts
            );

            const result = await service.apiKeysActiveExpired();

            expect(result).toBe(counts);
            expect(
                analyticApiKeyRepository.findActiveExpired
            ).toHaveBeenCalledWith(now);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.apiKeysActiveExpired}:_:_`,
                AnalyticApiKeyActiveExpiredCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});
