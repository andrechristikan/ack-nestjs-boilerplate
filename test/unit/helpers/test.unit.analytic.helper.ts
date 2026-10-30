import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import type {
    IPaginationOrderBy,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IActivityLogAnalyticList } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ISessionAnalyticSession } from '@modules/session/interfaces/session.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import type { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { AnalyticAnomalyUtil } from '@modules/analytic/utils/analytic.anomaly.util';
import { AnalyticSortUtil } from '@modules/analytic/utils/analytic.sort.util';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { SessionAnalyticDomain } from '@modules/session/domains/session.analytic.domain';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';

export interface IAnalyticAnomalyDomainDoubles {
    analyticCache: MockProxy<AnalyticCache>;
    analyticDateUtil: MockProxy<AnalyticDateUtil>;
    analyticAnomalyUtil: MockProxy<AnalyticAnomalyUtil>;
    analyticSortUtil: MockProxy<AnalyticSortUtil>;
    paginationService: MockProxy<PaginationService>;
    configService: MockProxy<ConfigService>;
    helperDateService: MockProxy<HelperDateService>;
    sessionAnalyticDomain: MockProxy<SessionAnalyticDomain>;
    userAnalyticDomain: MockProxy<UserAnalyticDomain>;
    activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain>;
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
            {
                provide: AnalyticAnomalyUtil,
                useValue: doubles.analyticAnomalyUtil,
            },
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
                provide: ActivityLogAnalyticDomain,
                useValue: doubles.activityLogAnalyticDomain,
            },
            {
                provide: DeviceAnalyticDomain,
                useValue: doubles.deviceAnalyticDomain,
            },
        ],
    }).compile();

    return module.get(AnalyticAnomalyDomainClass);
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

export function buildAnalyticActivityLog(
    id: string,
    userId: string,
    ipAddress: string | null,
    createdAt: Date
): IActivityLogAnalyticList {
    return {
        id,
        userId,
        action: EnumActivityLogAction.userLoginCredential,
        ipAddress,
        createdAt,
        workspaceId: null,
        userAgent: null,
    };
}

export function buildAnalyticOffsetParams(
    orderBy: IPaginationOrderBy[],
    skip: number,
    limit: number
): IPaginationQueryOffsetParams {
    return { orderBy, skip, limit };
}
