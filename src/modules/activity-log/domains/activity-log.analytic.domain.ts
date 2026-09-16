import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEventRow,
    IActivityLogAnalyticListRow,
} from '@modules/activity-log/interfaces/activity-log.analytic.repository.interface';
import { ActivityLogAnalyticRepository } from '@modules/activity-log/repositories/activity-log.analytic.repository';
import { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client';

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
