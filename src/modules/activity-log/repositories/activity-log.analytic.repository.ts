import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAnalyticListSelect } from '@modules/activity-log/constants/activity-log.constant';
import type { IActivityLogAnalyticRepository } from '@modules/activity-log/interfaces/activity-log.analytic-repository.interface';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticList,
    IActivityLogIpGroup,
    IActivityLogIpUserGroup,
    IActivityLogUserGroup,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogAnalyticRepository implements IActivityLogAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async countByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        workspaceId?: string
    ): Promise<number> {
        return this.databaseService.client.activityLog.count({
            where: {
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
                ...(workspaceId ? { workspaceId } : {}),
            },
        });
    }

    async groupByActionInRange(
        actions: EnumActivityLogAction[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['action'],
            where: {
                action: { in: actions },
                ...(startDate && endDate
                    ? { createdAt: { gte: startDate, lt: endDate } }
                    : {}),
            },
            _count: { _all: true },
        });
        return rows.map(r => ({ action: r.action, count: r._count._all }));
    }

    async findPageByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        cursor: string | null,
        limit: number
    ): Promise<IPaginationCursorReturn<IActivityLogAnalyticList>> {
        return this.paginationService.cursor<
            IActivityLogAnalyticList,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            where: {
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
            orderBy: [{ createdAt: EnumPaginationOrderDirectionType.asc }],
            limit,
            firstPageAt: endDate,
            select: ActivityLogAnalyticListSelect,
            ...(cursor !== null && { cursor }),
        });
    }

    async findOneByUserActionsInRange(
        userId: string,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticList | null> {
        return this.databaseService.client.activityLog.findFirst({
            where: {
                userId,
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
            select: ActivityLogAnalyticListSelect,
            orderBy: { createdAt: EnumPaginationOrderDirectionType.asc },
        });
    }

    async findCreatedAtByUserActionsInRange(
        userId: string,
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<Date[]> {
        const rows = await this.databaseService.client.activityLog.findMany({
            where: {
                userId,
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
            select: { createdAt: true },
            orderBy: { createdAt: EnumPaginationOrderDirectionType.asc },
        });
        return rows.map(row => row.createdAt);
    }

    async groupUserByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IActivityLogUserGroup[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['userId'],
            where: {
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
            having: { userId: { _count: { gte: min } } },
            _count: { _all: true },
        });
        return rows.map(row => ({
            userId: row.userId,
            count: row._count._all,
        }));
    }

    async groupUserIdByIps(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        ips: string[]
    ): Promise<string[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['userId'],
            where: {
                action: { in: actions },
                ipAddress: { in: ips },
                createdAt: { gte: startDate, lt: endDate },
            },
        });
        return rows.map(row => row.userId);
    }

    async groupIpUserByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogIpUserGroup[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['ipAddress', 'userId'],
            where: {
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
            _count: { _all: true },
        });
        return rows.map(row => ({
            ipAddress: row.ipAddress,
            userId: row.userId,
            count: row._count._all,
        }));
    }

    async groupIpByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IActivityLogIpGroup[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['ipAddress'],
            where: {
                action: { in: actions },
                ipAddress: { not: null },
                createdAt: { gte: startDate, lt: endDate },
            },
            having: { ipAddress: { _count: { gte: min } } },
            _count: { _all: true },
        });
        return rows.flatMap(row =>
            row.ipAddress === null
                ? []
                : [{ ipAddress: row.ipAddress, count: row._count._all }]
        );
    }

    async countByWorkspaceInRange(
        excludedActions: EnumActivityLogAction[],
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        const result = await this.databaseService.client.activityLog.aggregate({
            where: {
                workspaceId,
                action: { notIn: excludedActions },
                ...(startDate &&
                    endDate && { createdAt: { gte: startDate, lt: endDate } }),
            },
            _count: { _all: true },
        });

        return result._count._all;
    }

    async groupActivityByWorkspaceOffset(
        excludedActions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { skip, limit } = params;
        const scopedWhere: Prisma.ActivityLogWhereInput = {
            workspaceId: { not: null },
            workspace: { OR: WorkspaceActiveFilter },
            action: { notIn: excludedActions },
            createdAt: { gte: startDate, lt: endDate },
        };

        const [rows, groups] = await Promise.all([
            this.databaseService.client.activityLog.groupBy({
                by: ['workspaceId'],
                where: scopedWhere,
                _count: { _all: true },
                orderBy: [
                    {
                        _count: {
                            workspaceId: EnumPaginationOrderDirectionType.desc,
                        },
                    },
                    { workspaceId: EnumPaginationOrderDirectionType.asc },
                ],
                skip,
                take: limit,
            }),
            this.databaseService.client.activityLog.groupBy({
                by: ['workspaceId'],
                where: scopedWhere,
            }),
        ]);

        const data = rows
            .filter(row => row.workspaceId)
            .map(row => ({
                workspaceId: row.workspaceId as string,
                count: row._count._all,
            }));

        return this.paginationService.offsetPage(data, groups.length, {
            skip,
            limit,
        });
    }
}
