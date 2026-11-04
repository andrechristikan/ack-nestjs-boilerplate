import type {
    IPaginationCursorReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticList,
    IActivityLogIpGroup,
    IActivityLogIpUserGroup,
    IActivityLogUserGroup,
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
    findPageByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        cursor: string | null,
        limit: number
    ): Promise<IPaginationCursorReturn<IActivityLogAnalyticList>>;
    findOneByUserActionsInRange(
        userId: string,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticList | null>;
    findCreatedAtByUserActionsInRange(
        userId: string,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<Date[]>;
    groupUserByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IActivityLogUserGroup[]>;
    groupUserIdByIps(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        ips: string[]
    ): Promise<string[]>;
    groupIpUserByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogIpUserGroup[]>;
    groupIpByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IActivityLogIpGroup[]>;
    countByWorkspaceInRange(
        excludedActions: EnumActivityLogAction[],
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    groupActivityByWorkspaceOffset(
        excludedActions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>>;
}
