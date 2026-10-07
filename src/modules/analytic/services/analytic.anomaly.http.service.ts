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
import type { AnalyticDeviceProliferationListRequestDto } from '@modules/analytic/dtos/request/analytic.device-proliferation-list.request.dto';
import type { AnalyticImpossibleTravelListRequestDto } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import type { AnalyticLoginSpikeIpListRequestDto } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import type { AnalyticLoginTimeAnomalyListRequestDto } from '@modules/analytic/dtos/request/analytic.login-time-anomaly-list.request.dto';
import type { AnalyticNearLockoutListRequestDto } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import { AnalyticAnomalyDomain } from '@modules/analytic/domains/analytic.anomaly.domain';
import type {
    IAnalyticAnomalyDeviceProliferationSummary,
    IAnalyticAnomalyFailedLoginSpikeSummary,
    IAnalyticAnomalyImpossibleTravelSummary,
    IAnalyticAnomalyLoginSpikeIpSummary,
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import type { AnalyticWindowRequestDto } from '@modules/analytic/dtos/request/analytic.window.request.dto';
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
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalyImpossibleTravelSummary>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
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
            query.startDate ?? null,
            query.endDate ?? null
        );
        return this.analyticAnomalyDomain.impossibleTravelList(
            range.startDate,
            range.endDate,
            params
        );
    }

    async loginSpikeIpSummary(
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>> {
        const data = await this.analyticAnomalyDomain.loginSpikeIpSummary(
            query.windowMs ?? null
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
            query.windowMs ?? null,
            params
        );
    }

    async failedLoginSpikeSummary(): Promise<
        IResponseReturn<IAnalyticAnomalyFailedLoginSpikeSummary>
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
        IResponseReturn<IAnalyticAnomalyDeviceProliferationSummary>
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
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const range = this.analyticDateDomain.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
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
            query.startDate ?? null,
            query.endDate ?? null
        );
        return this.analyticAnomalyDomain.loginTimeList(
            range.startDate,
            range.endDate,
            params
        );
    }
}
