import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEvent,
} from '@modules/activity-log/interfaces/activity-log.interface';
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
    ): Promise<IActivityLogAnalyticEvent[]> {
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
            [...ActivityLogWorkspaceVolumeContract],
            workspaceId,
            startDate,
            endDate
        );
    }

    groupActivityByWorkspaceOffset(
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        return this.activityLogAnalyticRepository.groupActivityByWorkspaceOffset(
            [...ActivityLogWorkspaceVolumeContract],
            startDate,
            endDate,
            params
        );
    }
}
