import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { CacheService } from '@common/cache/services/cache.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticTermPolicyRepository } from '@modules/analytic/repositories/analytic.term-policy.repository';
import { AnalyticTermPolicyService } from '@modules/analytic/services/analytic.term-policy.service';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { AnalyticTermPolicyAcceptanceRateCacheSchema } from '@modules/analytic/dtos/analytic.term-policy-acceptance-rate-cache.dto';

describe('AnalyticTermPolicyService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticTermPolicyRepository: MockProxy<AnalyticTermPolicyRepository> =
        mock<AnalyticTermPolicyRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';

    let service: AnalyticTermPolicyService;

    beforeEach(async () => {
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) =>
                `${metric}:${start?.toISOString() ?? '_'}:${end?.toISOString() ?? '_'}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticTermPolicyService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                    }),
                },
                {
                    provide: AnalyticTermPolicyRepository,
                    useValue: analyticTermPolicyRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticTermPolicyService);
    });

    describe('getTermPolicyAcceptanceRate', () => {
        it('answers the rate from one repository call for the required types and the given dates', async () => {
            analyticTermPolicyRepository.findAcceptanceCounts.mockResolvedValue(
                { published: 2, acceptances: 40, users: 20 }
            );

            const result = await service.getTermPolicyAcceptanceRate(
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
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPolicyAcceptanceRate}:${startToken}:${endToken}`,
                AnalyticTermPolicyAcceptanceRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('passes open date bounds through as null', async () => {
            analyticTermPolicyRepository.findAcceptanceCounts.mockResolvedValue(
                { published: 0, acceptances: 0, users: 20 }
            );

            const result = await service.getTermPolicyAcceptanceRate(
                null,
                null
            );

            expect(result).toEqual({
                acceptances: 0,
                users: 20,
                published: 0,
                rate: 0,
            });
            expect(
                analyticTermPolicyRepository.findAcceptanceCounts
            ).toHaveBeenCalledWith(TermPolicyDefaultRequiredTypes, null, null);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.termPolicyAcceptanceRate}:_:_`,
                AnalyticTermPolicyAcceptanceRateCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});
