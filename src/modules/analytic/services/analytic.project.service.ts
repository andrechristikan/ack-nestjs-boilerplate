import { CacheService } from '@common/cache/services/cache.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticProjectRepository } from '@modules/analytic/repositories/analytic.project.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticProjectCreationCacheSchema } from '@modules/analytic/dtos/analytic.project-creation-cache.dto';

@Injectable()
export class AnalyticProjectService {
    private readonly perWorkspaceLimit: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly analyticCache: AnalyticCache,
        private readonly cacheService: CacheService,
        private readonly analyticProjectRepository: AnalyticProjectRepository
    ) {
        this.perWorkspaceLimit = this.configService.get<number>(
            'analytic.project.perWorkspaceLimit'
        )!;
    }

    async getProjectCreation(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticProjectCreation> {
        const key = this.analyticCache.buildDashboardKey(
            EnumAnalyticDashboardMetric.projectCreation,
            startDate,
            endDate
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
