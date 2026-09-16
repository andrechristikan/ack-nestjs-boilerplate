import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client';
import { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';

export interface IActivityLogAnalyticActionCount {
    action: EnumActivityLogAction;
    count: number;
}

export interface IActivityLogAnalyticEventRow {
    id: string;
    userId: string;
    action: EnumActivityLogAction;
    ipAddress: string | null;
    createdAt: Date;
    userAgent?: Prisma.JsonValue;
    workspaceId?: string | null;
}

export interface IActivityLogAnalyticListRow {
    id: string;
    userId: string;
    action: EnumActivityLogAction;
    ipAddress: string | null;
    createdAt: Date;
}

export interface IActivityLogAnalyticRepository {
    countByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        workspaceId?: string
    ): Promise<number>;
    groupByActionInRange(
        actions: EnumActivityLogAction[],
        startDate?: Date,
        endDate?: Date
    ): Promise<IActivityLogAnalyticActionCount[]>;
    findManyByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticEventRow[]>;
    countByWorkspaceInRange(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number>;
    groupActivityByWorkspaceInRange(
        startDate: Date,
        endDate: Date,
        take?: number
    ): Promise<IAnalyticWorkspaceCount[]>;
    listOffsetByActions(
        actions: EnumActivityLogAction[],
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLogAnalyticListRow>>;
}
