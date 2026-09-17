import type {
    IAnalyticAnomalySummary,
    IAnalyticDeviceProliferationRow,
    IAnalyticImpossibleTravelRow,
    IAnalyticLoginSpikeIpRow,
    IAnalyticLoginTimeAnomalyRow,
    IAnalyticNearLockoutRow,
} from '@modules/analytic/interfaces/analytic.interface';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDefaultAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import {
    AnalyticAdminListDoc,
    AnalyticAdminSummaryDoc,
} from '@modules/analytic/docs/analytic.admin.doc';
import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import type { AnalyticWindowRequestDto } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { AnalyticJsonResponseSchema } from '@modules/analytic/dtos/response/analytic.json.response.dto';
import { AnalyticSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.summary.response.dto';
import { AnalyticAnomalyHttpService } from '@modules/analytic/services/analytic.anomaly.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';

@ApiTags('modules.admin.analytic.anomaly')
@Controller({
    version: '1',
    path: '/analytic/anomaly',
})
export class AnalyticAnomalyAdminController {
    constructor(
        private readonly analyticAnomalyHttpService: AnalyticAnomalyHttpService
    ) {}

    @AnalyticAdminSummaryDoc('impossible travel anomaly summary')
    @Response('analytic.anomalyImpossibleTravel', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/impossible-travel')
    async impossibleTravel(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyHttpService.impossibleTravelSummary(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminListDoc('impossible travel anomaly list')
    @ResponsePaging('analytic.anomalyImpossibleTravelList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/impossible-travel/list')
    async impossibleTravelList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticImpossibleTravelRow>> {
        return this.analyticAnomalyHttpService.impossibleTravelList(
            query.startDate,
            query.endDate,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('login spike by IP anomaly summary')
    @Response('analytic.anomalyLoginSpikeIp', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/login-spike-ip')
    async loginSpikeIp(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyHttpService.loginSpikeIpSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('login spike by IP anomaly list')
    @ResponsePaging('analytic.anomalyLoginSpikeIpList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/login-spike-ip/list')
    async loginSpikeIpList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticLoginSpikeIpRow>> {
        return this.analyticAnomalyHttpService.loginSpikeIpList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('failed login spike anomaly summary')
    @Response('analytic.anomalyFailedLoginSpike', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/failed-login-spike')
    async failedLoginSpike(): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyHttpService.failedLoginSpikeSummary();
    }

    @AnalyticAdminListDoc('failed login spike anomaly list')
    @ResponsePaging('analytic.anomalyFailedLoginSpikeList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/failed-login-spike/list')
    async failedLoginSpikeList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticNearLockoutRow>> {
        return this.analyticAnomalyHttpService.failedLoginSpikeList(pagination);
    }

    @AnalyticAdminSummaryDoc('device proliferation anomaly summary')
    @Response('analytic.anomalyDeviceProliferation', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/device-proliferation')
    async deviceProliferation(): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyHttpService.deviceProliferationSummary();
    }

    @AnalyticAdminListDoc('device proliferation anomaly list')
    @ResponsePaging('analytic.anomalyDeviceProliferationList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/device-proliferation/list')
    async deviceProliferationList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticDeviceProliferationRow>> {
        return this.analyticAnomalyHttpService.deviceProliferationList(
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('login time anomaly summary')
    @Response('analytic.anomalyLoginTime', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/login-time')
    async loginTime(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticAnomalySummary> {
        return this.analyticAnomalyHttpService.loginTimeSummary(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminListDoc('login time anomaly list')
    @ResponsePaging('analytic.anomalyLoginTimeList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/login-time/list')
    async loginTimeList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticLoginTimeAnomalyRow>> {
        return this.analyticAnomalyHttpService.loginTimeList(
            query.startDate,
            query.endDate,
            pagination
        );
    }
}
