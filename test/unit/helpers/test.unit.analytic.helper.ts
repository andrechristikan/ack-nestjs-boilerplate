import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticAnomalyRepository } from '@modules/analytic/repositories/analytic.anomaly.repository';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { TestUnitKitProviders } from '@test/unit/helpers/test.unit.kit.helper';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';

export interface IAnalyticAnomalyServiceDoubles {
    analyticCache: MockProxy<AnalyticCache>;
    cacheService: MockProxy<CacheService>;
    configService: MockProxy<ConfigService>;
    featureFlagService: MockProxy<FeatureFlagService>;
    analyticSnapshotService: MockProxy<AnalyticSnapshotService>;
    analyticAnomalyRepository: MockProxy<AnalyticAnomalyRepository>;
}

export async function createAnalyticAnomalyService(
    doubles: IAnalyticAnomalyServiceDoubles
): Promise<AnalyticAnomalyService> {
    const module = await Test.createTestingModule({
        providers: [
            AnalyticAnomalyService,
            { provide: AnalyticCache, useValue: doubles.analyticCache },
            { provide: CacheService, useValue: doubles.cacheService },
            ...TestUnitKitProviders,
            AnalyticDateUtil,
            AnalyticFraudUtil,
            { provide: ConfigService, useValue: doubles.configService },
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

    return module.get(AnalyticAnomalyService);
}
