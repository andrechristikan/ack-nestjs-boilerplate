import { CacheService } from '@common/cache/services/cache.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticTermPolicyAcceptanceRateCacheSchema,
    AnalyticTermPolicyTimeToAcceptCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticTermPolicyRepository } from '@modules/analytic/repositories/analytic.term-policy.repository';
import { AnalyticTermPolicyService } from '@modules/analytic/services/analytic.term-policy.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';

describe('AnalyticTermPolicyService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
    const analyticTermPolicyRepository: MockProxy<AnalyticTermPolicyRepository> =
        mock<AnalyticTermPolicyRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';

    let service: AnalyticTermPolicyService;

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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticTermPolicyService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                { provide: HelperNumberService, useValue: helperNumberService },
                {
                    provide: AnalyticTermPolicyRepository,
                    useValue: analyticTermPolicyRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticTermPolicyService);
    });

    describe('termPoliciesAcceptanceRate', () => {
        it('answers the rate from one repository call for the required types and the given dates', async () => {
            analyticTermPolicyRepository.findAcceptanceCounts.mockResolvedValue(
                { published: 2, acceptances: 40, users: 20 }
            );
            helperNumberService.percent.mockReturnValue(100);

            const result = await service.termPoliciesAcceptanceRate(
                startDate,
                endDate
            );

            expect(result).toEqual({
                acceptances: 40,
                users: 20,
                published: 2,
                rate: 100,
            });
            expect(
                analyticTermPolicyRepository.findAcceptanceCounts
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticTermPolicyRepository.findAcceptanceCounts
            ).toHaveBeenCalledWith(
                TermPolicyDefaultRequiredTypes,
                startDate,
                endDate
            );
            expect(helperNumberService.percent).toHaveBeenCalledWith(40, 40);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPoliciesAcceptance}:${startToken}:${endToken}`,
                AnalyticTermPolicyAcceptanceRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('passes open date bounds through as null', async () => {
            analyticTermPolicyRepository.findAcceptanceCounts.mockResolvedValue(
                { published: 0, acceptances: 0, users: 20 }
            );
            helperNumberService.percent.mockReturnValue(0);

            const result = await service.termPoliciesAcceptanceRate(null, null);

            expect(result).toEqual({
                acceptances: 0,
                users: 20,
                published: 0,
                rate: 0,
            });
            expect(
                analyticTermPolicyRepository.findAcceptanceCounts
            ).toHaveBeenCalledWith(TermPolicyDefaultRequiredTypes, null, null);
            expect(helperNumberService.percent).toHaveBeenCalledWith(0, 0);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPoliciesAcceptance}:_:_`,
                AnalyticTermPolicyAcceptanceRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('termPoliciesTimeToAccept', () => {
        it('answers the count and average from one repository call', async () => {
            analyticTermPolicyRepository.findTimeToAccept.mockResolvedValue({
                count: 3,
                averageMs: 1500,
            });

            const result = await service.termPoliciesTimeToAccept(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 3, averageMs: 1500 });
            expect(
                analyticTermPolicyRepository.findTimeToAccept
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticTermPolicyRepository.findTimeToAccept
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPoliciesTimeToAccept}:${startToken}:${endToken}`,
                AnalyticTermPolicyTimeToAcceptCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('answers an average of 0 when no acceptance falls in the range', async () => {
            analyticTermPolicyRepository.findTimeToAccept.mockResolvedValue({
                count: 0,
                averageMs: null,
            });

            const result = await service.termPoliciesTimeToAccept(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 0, averageMs: 0 });
        });
    });
});
