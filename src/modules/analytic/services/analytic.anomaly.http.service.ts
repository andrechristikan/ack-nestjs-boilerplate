import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
    AnalyticNearLockoutAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import type { AnalyticDeviceProliferationListRequestDto } from '@modules/analytic/dtos/request/analytic-device-proliferation-list.request.dto';
import type { AnalyticImpossibleTravelListRequestDto } from '@modules/analytic/dtos/request/analytic-impossible-travel-list.request.dto';
import type { AnalyticLoginSpikeIpListRequestDto } from '@modules/analytic/dtos/request/analytic-login-spike-ip-list.request.dto';
import type { AnalyticLoginTimeAnomalyListRequestDto } from '@modules/analytic/dtos/request/analytic-login-time-anomaly-list.request.dto';
import type { AnalyticNearLockoutListRequestDto } from '@modules/analytic/dtos/request/analytic-near-lockout-list.request.dto';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import type {
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticAnomalyHttpService {
    constructor(
        private readonly analyticAnomalyDomain: AnalyticAnomalyDomain,
        private readonly analyticDateDomain: AnalyticDateDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async impossibleTravelSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticAnomalyDomain.impossibleTravelSummary(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async impossibleTravelList(
        query: AnalyticImpossibleTravelListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.SessionWhereInput>(query, {
                availableOrderBy: AnalyticImpossibleTravelAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateDomain.optionalRange(
            (query.startDate as Date | undefined) ?? null,
            (query.endDate as Date | undefined) ?? null
        );
        return this.analyticAnomalyDomain.impossibleTravelList(
            range.startDate,
            range.endDate,
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

    async loginSpikeIpList(
        query: AnalyticLoginSpikeIpListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticLoginSpikeIpAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyDomain.loginSpikeIpList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async failedLoginSpikeSummary(): Promise<
        IResponseReturn<IAnalyticAnomalySummary>
    > {
        const data = await this.analyticAnomalyDomain.failedLoginSpikeSummary();

        return { data };
    }

    async failedLoginSpikeList(
        query: AnalyticNearLockoutListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableOrderBy: AnalyticNearLockoutAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyDomain.failedLoginSpikeList(params);
    }

    async deviceProliferationSummary(): Promise<
        IResponseReturn<IAnalyticAnomalySummary>
    > {
        const data =
            await this.analyticAnomalyDomain.deviceProliferationSummary();

        return { data };
    }

    async deviceProliferationList(
        query: AnalyticDeviceProliferationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    availableOrderBy:
                        AnalyticDeviceProliferationAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyDomain.deviceProliferationList(params);
    }

    async loginTimeSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const range = this.analyticDateDomain.optionalRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticAnomalyDomain.loginTimeSummary(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async loginTimeList(
        query: AnalyticLoginTimeAnomalyListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticLoginTimeAnomalyAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateDomain.optionalRange(
            (query.startDate as Date | undefined) ?? null,
            (query.endDate as Date | undefined) ?? null
        );
        return this.analyticAnomalyDomain.loginTimeList(
            range.startDate,
            range.endDate,
            params
        );
    }
}
