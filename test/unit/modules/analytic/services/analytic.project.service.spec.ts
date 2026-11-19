import { CacheService } from '@common/cache/services/cache.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticProjectCountPageCacheSchema,
    AnalyticProjectCreationCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticProjectRepository } from '@modules/analytic/repositories/analytic.project.repository';
import { AnalyticProjectService } from '@modules/analytic/services/analytic.project.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('AnalyticProjectService', () => {
    const dashboardTtlInMs = 1800000;
    const perWorkspaceLimit = 100;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const analyticProjectRepository: MockProxy<AnalyticProjectRepository> =
        mock<AnalyticProjectRepository>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';
    const pagination = { skip: 0, limit: 20, orderBy: [] };
    const page = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [{ projectId: 'project-1', count: 4 }],
    };
    const cachedValue = { count: 99 };

    let service: AnalyticProjectService;

    beforeEach(async () => {
        vi.resetAllMocks();

        analyticDateUtil.cacheToken.mockImplementation((date: Date | null) =>
            date ? date.toISOString() : '_'
        );
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) => `${metric}:${start}:${end}`
        );
        analyticCache.buildDashboardPageKey.mockImplementation(
            (metric, start, end, pageNumber, perPage) =>
                `${metric}:${start}:${end}:${pageNumber}:${perPage}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticProjectService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'analytic.project.perWorkspaceLimit': perWorkspaceLimit,
                    }),
                },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                {
                    provide: AnalyticProjectRepository,
                    useValue: analyticProjectRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticProjectService);
    });

    describe('projectsCreation', () => {
        it('passes the range and the configured limit to one repository method', async () => {
            const creation = {
                created: 2,
                perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
            };
            analyticProjectRepository.findCreation.mockResolvedValue(creation);

            const result = await service.projectsCreation(startDate, endDate);

            expect(result).toBe(creation);
            expect(
                analyticProjectRepository.findCreation
            ).toHaveBeenCalledTimes(1);
            expect(analyticProjectRepository.findCreation).toHaveBeenCalledWith(
                startDate,
                endDate,
                perWorkspaceLimit
            );
        });

        it('reads through with the dashboard key, AnalyticProjectCreationCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            await service.projectsCreation(startDate, endDate);

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.projectsCreation}:${startToken}:${endToken}`,
                AnalyticProjectCreationCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('projectsMembership', () => {
        it('passes the pagination params to one repository method and returns its page unchanged', async () => {
            analyticProjectRepository.groupMembership.mockResolvedValue(page);

            const result = await service.projectsMembership(pagination);

            expect(result).toBe(page);
            expect(
                analyticProjectRepository.groupMembership
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticProjectRepository.groupMembership
            ).toHaveBeenCalledWith(pagination);
        });

        it('reads through with the page key, AnalyticProjectCountPageCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            await service.projectsMembership(pagination);

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.projectsMembership}:_:_:1:20`,
                AnalyticProjectCountPageCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });
});
