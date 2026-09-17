import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import type {
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferationRow,
    IAnalyticImpossibleTravelRow,
    IAnalyticLoginSpikeIpRow,
    IAnalyticLoginTimeAnomalyRow,
    IAnalyticNearLockoutRow,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class AnalyticAnomalyHttpService {
    constructor(
        private readonly analyticAnomalyDomain: AnalyticAnomalyDomain,
        private readonly analyticDateUtil: AnalyticDateUtil
    ) {}

    impossibleTravelSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticAnomalySummary> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticAnomalyDomain.impossibleTravelSummary(
            range.startDate ?? null,
            range.endDate ?? null
        );
    }

    impossibleTravelList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticImpossibleTravelRow>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticAnomalyDomain.impossibleTravelList(
            range.startDate ?? null,
            range.endDate ?? null,
            params
        );
    }

    loginSpikeIpSummary(windowMs?: number): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyDomain.loginSpikeIpSummary(windowMs ?? null);
    }

    loginSpikeIpList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticLoginSpikeIpRow>> {
        return this.analyticAnomalyDomain.loginSpikeIpList(
            windowMs ?? null,
            params
        );
    }

    failedLoginSpikeSummary(): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyDomain.failedLoginSpikeSummary();
    }

    failedLoginSpikeList(
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticNearLockoutRow>> {
        return this.analyticAnomalyDomain.failedLoginSpikeList(params);
    }

    deviceProliferationSummary(): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyDomain.deviceProliferationSummary();
    }

    deviceProliferationList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticDeviceProliferationRow>> {
        return this.analyticAnomalyDomain.deviceProliferationList(params);
    }

    loginTimeSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticAnomalySummary> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticAnomalyDomain.loginTimeSummary(
            range.startDate ?? null,
            range.endDate ?? null
        );
    }

    loginTimeList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticLoginTimeAnomalyRow>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticAnomalyDomain.loginTimeList(
            range.startDate ?? null,
            range.endDate ?? null,
            params
        );
    }
}
