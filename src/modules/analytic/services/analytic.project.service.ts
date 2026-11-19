import { CacheService } from '@common/cache/services/cache.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticProjectCreationCacheSchema } from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticProjectRepository } from '@modules/analytic/repositories/analytic.project.repository';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticProjectService {
    private readonly perWorkspaceLimit: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticDateUtil: AnalyticDateUtil,
        private readonly analyticProjectRepository: AnalyticProjectRepository
    ) {
        this.perWorkspaceLimit = this.configService.get<number>(
            'analytic.project.perWorkspaceLimit'
        )!;
    }

    async projectsCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        const start = this.analyticDateUtil.cacheToken(startDate);
        const end = this.analyticDateUtil.cacheToken(endDate);
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.projectsCreation,
            start,
            end
        );

        return this.cacheService.readThrough(
            key,
            AnalyticProjectCreationCacheSchema,
            this.analyticCache.dashboardTtlInMs,
            () =>
                this.analyticProjectRepository.findCreation(
                    startDate,
                    endDate,
                    this.perWorkspaceLimit
                )
        );
    }
}
