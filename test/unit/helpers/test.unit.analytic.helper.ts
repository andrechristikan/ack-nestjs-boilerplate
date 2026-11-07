import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import type {
    IPaginationOrderBy,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { ISessionAnalyticSession } from '@modules/session/interfaces/session.interface';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import type { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticFraudUtil } from '@modules/analytic/utils/analytic.fraud.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { SessionAnalyticService } from '@modules/session/services/session.analytic.service';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';

export interface IAnalyticAnomalyServiceDoubles {
    analyticCache: MockProxy<AnalyticCache>;
    analyticDateService: MockProxy<AnalyticDateService>;
    analyticDateUtil: MockProxy<AnalyticDateUtil>;
    analyticAnomalyUtil: MockProxy<AnalyticAnomalyUtil>;
    analyticSortUtil: MockProxy<AnalyticSortUtil>;
    analyticFraudUtil: MockProxy<AnalyticFraudUtil>;
    paginationOffsetUtil: MockProxy<PaginationOffsetUtil>;
    configService: MockProxy<ConfigService>;
    helperArrayService: MockProxy<HelperArrayService>;
    helperDateService: MockProxy<HelperDateService>;
    sessionAnalyticService: MockProxy<SessionAnalyticService>;
    userAnalyticService: MockProxy<UserAnalyticService>;
    activityLogAnalyticService: MockProxy<ActivityLogAnalyticService>;
    deviceAnalyticService: MockProxy<DeviceAnalyticService>;
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
            {
                provide: AnalyticDateService,
                useValue: doubles.analyticDateService,
            },
            { provide: AnalyticDateUtil, useValue: doubles.analyticDateUtil },
            {
                provide: AnalyticAnomalyUtil,
                useValue: doubles.analyticAnomalyUtil,
            },
            { provide: AnalyticSortUtil, useValue: doubles.analyticSortUtil },
            {
                provide: AnalyticFraudUtil,
                useValue: doubles.analyticFraudUtil,
            },
            {
                provide: PaginationOffsetUtil,
                useValue: doubles.paginationOffsetUtil,
            },
            { provide: ConfigService, useValue: doubles.configService },
            {
                provide: HelperArrayService,
                useValue: doubles.helperArrayService,
            },
            { provide: HelperDateService, useValue: doubles.helperDateService },
            {
                provide: SessionAnalyticService,
                useValue: doubles.sessionAnalyticService,
            },
            {
                provide: UserAnalyticService,
                useValue: doubles.userAnalyticService,
            },
            {
                provide: ActivityLogAnalyticService,
                useValue: doubles.activityLogAnalyticService,
            },
            {
                provide: DeviceAnalyticService,
                useValue: doubles.deviceAnalyticService,
            },
        ],
    }).compile();

    return module.get(AnalyticAnomalyServiceClass);
}

export function buildAnalyticSession(
    id: string,
    userId: string,
    createdAt: Date,
    geoLocation: GeoLocation | null,
    userAgent: UserAgent
): ISessionAnalyticSession {
    return { id, userId, ipAddress: null, createdAt, geoLocation, userAgent };
}

export function buildAnalyticOffsetParams(
    orderBy: IPaginationOrderBy[],
    skip: number,
    limit: number
): IPaginationQueryOffsetParams {
    return { orderBy, skip, limit };
}
