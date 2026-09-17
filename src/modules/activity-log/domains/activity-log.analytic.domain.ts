import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogWorkspaceVolumeExcludedActions } from '@modules/activity-log/constants/activity-log.analytic.constant';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEventRow,
    IActivityLogAnalyticListRow,
} from '@modules/activity-log/interfaces/activity-log.analytic.repository.interface';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogAnalyticDomain {
    constructor(
        private readonly activityLogAnalyticRepository: ActivityLogAnalyticRepository
    ) {}

    countByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        workspaceId?: string
    ): Promise<number> {
        return this.activityLogAnalyticRepository.countByActionsInRange(
            actions,
            startDate,
            endDate,
            workspaceId
        );
    }

    groupByActionInRange(
        actions: EnumActivityLogAction[],
        startDate?: Date,
        endDate?: Date
    ): Promise<IActivityLogAnalyticActionCount[]> {
        return this.activityLogAnalyticRepository.groupByActionInRange(
            actions,
            startDate,
            endDate
        );
    }

    findManyByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticEventRow[]> {
        return this.activityLogAnalyticRepository.findManyByActionsInRange(
            actions,
            startDate,
            endDate
        );
    }

    countByWorkspaceInRange(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.activityLogAnalyticRepository.countByWorkspaceInRange(
            ActivityLogWorkspaceVolumeExcludedActions,
            workspaceId,
            startDate,
            endDate
        );
    }

    groupActivityByWorkspaceInRange(
        startDate: Date,
        endDate: Date,
        take?: number
    ): Promise<IAnalyticWorkspaceCount[]> {
        return this.activityLogAnalyticRepository.groupActivityByWorkspaceInRange(
            ActivityLogWorkspaceVolumeExcludedActions,
            startDate,
            endDate,
            take
        );
    }

    listOffsetByActions(
        actions: EnumActivityLogAction[],
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLogAnalyticListRow>> {
        return this.activityLogAnalyticRepository.listOffsetByActions(
            actions,
            startDate,
            endDate,
            params
        );
    }
}
