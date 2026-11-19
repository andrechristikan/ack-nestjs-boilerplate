import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    EnumActivityLogAction,
    Prisma,
} from '@generated/prisma-client/client';
import {
    AnalyticWorkspaceActivityVolumePipelineSchema,
    AnalyticWorkspaceMembershipPipelineSchema,
    AnalyticWorkspaceSummaryPipelineSchema,
} from '@modules/analytic/constants/analytic.constant';
import type {
    IAnalyticRoleCount,
    IAnalyticSnapshotItemInput,
    IAnalyticStatusCount,
    IAnalyticWorkspaceCount,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticWorkspaceRepository } from '@modules/analytic/interfaces/analytic.workspace-repository.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticWorkspaceRepository implements IAnalyticWorkspaceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    private liveWorkspaceStages(): Prisma.InputJsonValue[] {
        return [
            {
                $lookup: {
                    from: 'Workspaces',
                    localField: '_id',
                    foreignField: '_id',
                    pipeline: [
                        { $match: { deletedAt: null } },
                        { $project: { _id: 1 } },
                    ],
                    as: 'workspace',
                },
            },
            { $match: { workspace: { $ne: [] } } },
        ];
    }

    private optionalRangeMatch(
        startDate: Date | null,
        endDate: Date | null
    ): Prisma.InputJsonObject {
        if (startDate === null || endDate === null) {
            return {};
        }

        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);

        return { createdAt: { $gte: start, $lt: end } };
    }

    async countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.workspace.count({
            where: {
                deletedAt: null,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async groupInviteFunnel(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        const rows = await this.databaseService.client.workspaceInvite.groupBy({
            by: ['status'],
            where: {
                createdAt: { gte: startDate, lt: endDate },
                ...(workspaceId !== null && { workspaceId }),
            },
            _count: { _all: true },
        });

        return rows.map(row => ({
            status: row.status,
            count: row._count._all,
        }));
    }

    async groupJoinOutcomes(
        startDate: Date,
        endDate: Date,
        workspaceId: string | null
    ): Promise<IAnalyticStatusCount[]> {
        const rows =
            await this.databaseService.client.workspaceJoinRequest.groupBy({
                by: ['status'],
                where: {
                    createdAt: { gte: startDate, lt: endDate },
                    ...(workspaceId !== null && { workspaceId }),
                },
                _count: { _all: true },
            });

        return rows.map(row => ({
            status: row.status,
            count: row._count._all,
        }));
    }

    async findMembership(): Promise<
        IAnalyticSnapshotItemInput<IAnalyticWorkspaceCount>[]
    > {
        const liveStages = this.liveWorkspaceStages();
        const result =
            await this.databaseService.client.workspaceMember.aggregateRaw({
                pipeline: [
                    { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
                    ...liveStages,
                ],
            });
        const parsed =
            AnalyticWorkspaceMembershipPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data.map(row => ({
            key: row._id,
            value: row.count,
            occurredAt: null,
            data: { workspaceId: row._id, count: row.count },
        }));
    }

    async groupActivityVolume(
        startDate: Date,
        endDate: Date,
        excludedActions: EnumActivityLogAction[],
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);
        const liveStages = this.liveWorkspaceStages();
        const result =
            await this.databaseService.client.activityLog.aggregateRaw({
                pipeline: [
                    {
                        $match: {
                            workspaceId: { $ne: null },
                            action: { $nin: excludedActions },
                            createdAt: { $gte: start, $lt: end },
                        },
                    },
                    { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
                    ...liveStages,
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed =
            AnalyticWorkspaceActivityVolumePipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;
        const data = (row?.data ?? []).map(item => ({
            workspaceId: item._id,
            count: item.count,
        }));

        return this.paginationOffsetUtil.page(
            data,
            row?.total[0]?.n ?? 0,
            params
        );
    }

    async groupMemberRoles(workspaceId: string): Promise<IAnalyticRoleCount[]> {
        const rows = await this.databaseService.client.workspaceMember.groupBy({
            by: ['role'],
            where: { workspaceId, workspace: { deletedAt: null } },
            _count: { _all: true },
        });

        return rows.map(row => ({ role: row.role, count: row._count._all }));
    }

    async findSummary(
        workspaceId: string,
        startDate: Date | null,
        endDate: Date | null,
        excludedActions: EnumActivityLogAction[]
    ): Promise<IAnalyticWorkspaceSummary> {
        const id = this.analyticPipelineUtil.toObjectId(workspaceId);
        const rangeMatch = this.optionalRangeMatch(startDate, endDate);
        const activityMatch = {
            action: { $nin: excludedActions },
            ...rangeMatch,
        };
        const result = await this.databaseService.client.workspace.aggregateRaw(
            {
                pipeline: [
                    { $match: { _id: id } },
                    {
                        $lookup: {
                            from: 'WorkspaceMembers',
                            localField: '_id',
                            foreignField: 'workspaceId',
                            pipeline: [{ $count: 'n' }],
                            as: 'members',
                        },
                    },
                    {
                        $lookup: {
                            from: 'Projects',
                            localField: '_id',
                            foreignField: 'workspaceId',
                            pipeline: [
                                { $match: { deletedAt: null } },
                                { $count: 'n' },
                            ],
                            as: 'projects',
                        },
                    },
                    {
                        $lookup: {
                            from: 'ActivityLogs',
                            localField: '_id',
                            foreignField: 'workspaceId',
                            pipeline: [
                                { $match: activityMatch },
                                { $count: 'n' },
                            ],
                            as: 'activity',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            memberCount: {
                                $ifNull: [
                                    { $arrayElemAt: ['$members.n', 0] },
                                    0,
                                ],
                            },
                            projectCount: {
                                $ifNull: [
                                    { $arrayElemAt: ['$projects.n', 0] },
                                    0,
                                ],
                            },
                            activityCount: {
                                $ifNull: [
                                    { $arrayElemAt: ['$activity.n', 0] },
                                    0,
                                ],
                            },
                        },
                    },
                ],
            }
        );
        const parsed = AnalyticWorkspaceSummaryPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return (
            parsed.data[0] ?? {
                memberCount: 0,
                projectCount: 0,
                activityCount: 0,
            }
        );
    }
}
