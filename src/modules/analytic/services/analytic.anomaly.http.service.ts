import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import type {
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticNearLockout,
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

    async impossibleTravelSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        const data = await this.analyticAnomalyDomain.impossibleTravelSummary(
            range.startDate ?? null,
            range.endDate ?? null
        );

        return { data };
    }

    impossibleTravelList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticImpossibleTravel>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticAnomalyDomain.impossibleTravelList(
            range.startDate ?? null,
            range.endDate ?? null,
            params
        );
    }

    async loginSpikeIpSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const data = await this.analyticAnomalyDomain.loginSpikeIpSummary(
            windowMs ?? null
        );

        return { data };
    }

    loginSpikeIpList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticLoginSpikeIp>> {
        return this.analyticAnomalyDomain.loginSpikeIpList(
            windowMs ?? null,
            params
        );
    }

    async failedLoginSpikeSummary(): Promise<
        IResponseReturn<IAnalyticAnomalySummary>
    > {
        const data = await this.analyticAnomalyDomain.failedLoginSpikeSummary();

        return { data };
    }

    failedLoginSpikeList(
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticNearLockout>> {
        return this.analyticAnomalyDomain.failedLoginSpikeList(params);
    }

    async deviceProliferationSummary(): Promise<
        IResponseReturn<IAnalyticAnomalySummary>
    > {
        const data =
            await this.analyticAnomalyDomain.deviceProliferationSummary();

        return { data };
    }

    deviceProliferationList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticDeviceProliferation>> {
        return this.analyticAnomalyDomain.deviceProliferationList(params);
    }

    async loginTimeSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        const data = await this.analyticAnomalyDomain.loginTimeSummary(
            range.startDate ?? null,
            range.endDate ?? null
        );

        return { data };
    }

    loginTimeList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticLoginTimeAnomaly>> {
        const range = this.analyticDateUtil.optionalRange(startDate, endDate);
        return this.analyticAnomalyDomain.loginTimeList(
            range.startDate ?? null,
            range.endDate ?? null,
            params
        );
    }
}
