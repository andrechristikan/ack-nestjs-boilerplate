import type {
    IPaginationCursorReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticList,
    IActivityLogIpGroup,
    IActivityLogIpUserGroup,
    IActivityLogUserGroup,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogAnalyticDomain {
    private readonly pageSize: number;

    constructor(
        private readonly activityLogAnalyticRepository: ActivityLogAnalyticRepository,
        private readonly configService: ConfigService
    ) {
        this.pageSize = this.configService.get<number>(
            'activityLog.analytic.pageSize'
        )!;
    }

    async getCountByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return await this.activityLogAnalyticRepository.countByActionsInRange(
            actions,
            startDate,
            endDate
        );
    }

    async getGroupByActionInRange(
        actions: EnumActivityLogAction[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]> {
        return await this.activityLogAnalyticRepository.groupByActionInRange(
            actions,
            startDate,
            endDate
        );
    }

    async getPageByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        cursor: string | null
    ): Promise<IPaginationCursorReturn<IActivityLogAnalyticList>> {
        return await this.activityLogAnalyticRepository.findPageByActionsInRange(
            actions,
            startDate,
            endDate,
            cursor,
            this.pageSize
        );
    }

    async getOneByUserActionsInRange(
        userId: string,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticList | null> {
        return await this.activityLogAnalyticRepository.findOneByUserActionsInRange(
            userId,
            actions,
            startDate,
            endDate
        );
    }

    async getCreatedAtByUserActionsInRange(
        userId: string,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        limit: number
    ): Promise<Date[]> {
        const rows =
            await this.activityLogAnalyticRepository.findCreatedAtByUserActionsInRange(
                userId,
                actions,
                startDate,
                endDate,
                limit
            );
        return rows.toReversed();
    }

    async getGroupUserByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IActivityLogUserGroup[]> {
        return await this.activityLogAnalyticRepository.groupUserByActions(
            actions,
            startDate,
            endDate,
            min
        );
    }

    async getGroupUserIdByIps(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        ips: string[]
    ): Promise<string[]> {
        return await this.activityLogAnalyticRepository.groupUserIdByIps(
            actions,
            startDate,
            endDate,
            ips
        );
    }

    async getGroupIpUserByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogIpUserGroup[]> {
        return await this.activityLogAnalyticRepository.groupIpUserByActions(
            actions,
            startDate,
            endDate
        );
    }

    async getGroupIpByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IActivityLogIpGroup[]> {
        return await this.activityLogAnalyticRepository.groupIpByActions(
            actions,
            startDate,
            endDate,
            min
        );
    }

    async getCountByWorkspaceInRange(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        return await this.activityLogAnalyticRepository.countByWorkspaceInRange(
            [...ActivityLogWorkspaceVolumeContract],
            workspaceId,
            startDate,
            endDate
        );
    }

    async getGroupActivityByWorkspaceOffset(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return await this.activityLogAnalyticRepository.groupActivityByWorkspaceOffset(
            [...ActivityLogWorkspaceVolumeContract],
            startDate,
            endDate,
            params
        );
    }
}
