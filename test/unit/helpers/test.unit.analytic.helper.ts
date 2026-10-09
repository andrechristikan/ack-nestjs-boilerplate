import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import type { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticGeoUtil } from '@modules/analytic/utils/analytic.geo.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserLoginAnalyticDomain } from '@modules/user/domains/user.login.analytic.domain';

export interface IAnalyticAnomalyDomainDoubles {
    analyticCache: MockProxy<AnalyticCache>;
    analyticDateUtil: MockProxy<AnalyticDateUtil>;
    analyticGeoUtil: MockProxy<AnalyticGeoUtil>;
    analyticSortUtil: MockProxy<AnalyticSortUtil>;
    paginationService: MockProxy<PaginationService>;
    configService: MockProxy<ConfigService>;
    helperDateService: MockProxy<HelperDateService>;
    sessionAnalyticDomain: MockProxy<SessionAnalyticDomain>;
    userAnalyticDomain: MockProxy<UserAnalyticDomain>;
    userLoginAnalyticDomain: MockProxy<UserLoginAnalyticDomain>;
    deviceAnalyticDomain: MockProxy<DeviceAnalyticDomain>;
}

export async function createAnalyticAnomalyDomain(
    doubles: IAnalyticAnomalyDomainDoubles
): Promise<AnalyticAnomalyDomain> {
    const { AnalyticAnomalyDomain: AnalyticAnomalyDomainClass } =
        await import('@modules/analytic/domains/analytic.anomaly.domain');

    const module = await Test.createTestingModule({
        providers: [
            AnalyticAnomalyDomainClass,
            { provide: AnalyticCache, useValue: doubles.analyticCache },
            { provide: AnalyticDateUtil, useValue: doubles.analyticDateUtil },
            { provide: AnalyticGeoUtil, useValue: doubles.analyticGeoUtil },
            { provide: AnalyticSortUtil, useValue: doubles.analyticSortUtil },
            { provide: PaginationService, useValue: doubles.paginationService },
            { provide: ConfigService, useValue: doubles.configService },
            { provide: HelperDateService, useValue: doubles.helperDateService },
            {
                provide: SessionAnalyticDomain,
                useValue: doubles.sessionAnalyticDomain,
            },
            {
                provide: UserAnalyticDomain,
                useValue: doubles.userAnalyticDomain,
            },
            {
                provide: UserLoginAnalyticDomain,
                useValue: doubles.userLoginAnalyticDomain,
            },
            {
                provide: DeviceAnalyticDomain,
                useValue: doubles.deviceAnalyticDomain,
            },
        ],
    }).compile();

    return module.get(AnalyticAnomalyDomainClass);
}
