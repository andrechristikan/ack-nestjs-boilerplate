import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type {
    IActivityLogAnalytic,
    IActivityLogAnalyticActionCount,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';

export interface IActivityLogAnalyticRepository {
    countByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        workspaceId?: string
    ): Promise<number>;
    groupByActionInRange(
        actions: EnumActivityLogAction[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]>;
    findManyByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalytic[]>;
    countByWorkspaceInRange(
        excludedActions: EnumActivityLogAction[],
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number>;
    groupActivityByWorkspaceOffset(
        excludedActions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>>;
}
