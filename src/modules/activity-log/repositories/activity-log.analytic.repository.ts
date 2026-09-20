import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IActivityLogAnalyticRepository } from '@modules/activity-log/interfaces/activity-log.analytic-repository.interface';
import type {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEvent,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
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
        startDate?: Date,
        endDate?: Date
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

    async findManyByActionsInRange(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticEvent[]> {
        return this.databaseService.client.activityLog.findMany({
            where: {
                action: { in: actions },
                createdAt: { gte: startDate, lt: endDate },
            },
            select: {
                id: true,
                userId: true,
                action: true,
                ipAddress: true,
                createdAt: true,
                userAgent: true,
                workspaceId: true,
            },
            orderBy: { createdAt: EnumPaginationOrderDirectionType.asc },
        });
    }

    async countByWorkspaceInRange(
        excludedActions: EnumActivityLogAction[],
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.databaseService.client.activityLog.count({
            where: {
                workspaceId,
                action: { notIn: excludedActions },
                createdAt: { gte: startDate, lt: endDate },
            },
        });
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
