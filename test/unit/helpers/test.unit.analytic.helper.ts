import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyRepository } from '@modules/analytic/repositories/analytic.anomaly.repository';
import type { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';

export interface IAnalyticAnomalyServiceDoubles {
    analyticCache: MockProxy<AnalyticCache>;
    cacheService: MockProxy<CacheService>;
    analyticDateUtil: MockProxy<AnalyticDateUtil>;
    analyticFraudUtil: MockProxy<AnalyticFraudUtil>;
    configService: MockProxy<ConfigService>;
    helperDateService: MockProxy<HelperDateService>;
    featureFlagService: MockProxy<FeatureFlagService>;
    analyticSnapshotService: MockProxy<AnalyticSnapshotService>;
    analyticAnomalyRepository: MockProxy<AnalyticAnomalyRepository>;
}

export async function createAnalyticAnomalyService(
    doubles: IAnalyticAnomalyServiceDoubles
): Promise<AnalyticAnomalyService> {
    const { AnalyticAnomalyService: AnalyticAnomalyServiceClass } =
        await import('@modules/analytic/services/analytic.anomaly.service');

    const module = await Test.createTestingModule({
        providers: [
            AnalyticAnomalyServiceClass,
            { provide: AnalyticCache, useValue: doubles.analyticCache },
            { provide: CacheService, useValue: doubles.cacheService },
            { provide: AnalyticDateUtil, useValue: doubles.analyticDateUtil },
            {
                provide: AnalyticFraudUtil,
                useValue: doubles.analyticFraudUtil,
            },
            { provide: ConfigService, useValue: doubles.configService },
            { provide: HelperDateService, useValue: doubles.helperDateService },
            {
                provide: FeatureFlagService,
                useValue: doubles.featureFlagService,
            },
            {
                provide: AnalyticSnapshotService,
                useValue: doubles.analyticSnapshotService,
            },
            {
                provide: AnalyticAnomalyRepository,
                useValue: doubles.analyticAnomalyRepository,
            },
        ],
    }).compile();

    return module.get(AnalyticAnomalyServiceClass);
}
