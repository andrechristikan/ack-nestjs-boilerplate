import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IActivityLogAnalyticActionCount,
    IActivityLogAnalyticEventRow,
    IActivityLogAnalyticListRow,
    IActivityLogAnalyticRepository,
} from '@modules/activity-log/interfaces/activity-log.analytic.repository.interface';
import { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client';

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
    ): Promise<IActivityLogAnalyticEventRow[]> {
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
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.databaseService.client.activityLog.count({
            where: {
                workspaceId,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async groupActivityByWorkspaceInRange(
        startDate: Date,
        endDate: Date,
        take = 20
    ): Promise<IAnalyticWorkspaceCount[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['workspaceId'],
            where: {
                workspaceId: { not: null },
                createdAt: { gte: startDate, lt: endDate },
            },
            _count: { _all: true },
            orderBy: {
                _count: { workspaceId: EnumPaginationOrderDirectionType.desc },
            },
            take,
        });
        return rows
            .filter(r => r.workspaceId)
            .map(r => ({
                workspaceId: r.workspaceId as string,
                count: r._count._all,
            }));
    }

    async listOffsetByActions(
        actions: EnumActivityLogAction[],
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLogAnalyticListRow>> {
        const { where, ...rest } = params;
        return this.paginationService.offset(
            this.databaseService.client.activityLog,
            {
                ...rest,
                where: {
                    AND: [
                        ...(where ? [where] : []),
                        { action: { in: actions } },
                        ...(startDate && endDate
                            ? [{ createdAt: { gte: startDate, lt: endDate } }]
                            : []),
                    ],
                },
            }
        );
    }
}
