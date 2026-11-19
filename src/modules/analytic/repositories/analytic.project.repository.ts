import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    AnalyticProjectCreationPipelineSchema,
    AnalyticProjectMembershipPipelineSchema,
} from '@modules/analytic/constants/analytic.constant';
import type {
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticProjectRepository } from '@modules/analytic/interfaces/analytic.project-repository.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticProjectRepository implements IAnalyticProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationOffsetUtil: PaginationOffsetUtil,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async findCreation(
        startDate: Date,
        endDate: Date,
        perWorkspaceLimit: number
    ): Promise<IAnalyticProjectCreation> {
        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);
        const result = await this.databaseService.client.project.aggregateRaw({
            pipeline: [
                {
                    $match: {
                        deletedAt: null,
                        createdAt: { $gte: start, $lt: end },
                    },
                },
                {
                    $facet: {
                        created: [{ $count: 'n' }],
                        perWorkspace: [
                            {
                                $group: {
                                    _id: '$workspaceId',
                                    count: { $sum: 1 },
                                },
                            },
                            this.analyticPipelineUtil.sortStage(
                                [
                                    {
                                        count: EnumPaginationOrderDirectionType.desc,
                                    },
                                ],
                                '_id'
                            ),
                            { $limit: perWorkspaceLimit },
                        ],
                    },
                },
            ],
        });
        const parsed = AnalyticProjectCreationPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;

        return {
            created: row?.created[0]?.n ?? 0,
            perWorkspace: (row?.perWorkspace ?? []).map(item => ({
                workspaceId: item._id,
                count: item.count,
            })),
        };
    }

    async groupMembership(
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const result =
            await this.databaseService.client.projectMember.aggregateRaw({
                pipeline: [
                    { $group: { _id: '$projectId', count: { $sum: 1 } } },
                    {
                        $lookup: {
                            from: 'Projects',
                            localField: '_id',
                            foreignField: '_id',
                            pipeline: [
                                { $match: { deletedAt: null } },
                                { $project: { _id: 1 } },
                            ],
                            as: 'project',
                        },
                    },
                    { $match: { project: { $ne: [] } } },
                    this.analyticPipelineUtil.pageStage(params, '_id'),
                ],
            });
        const parsed =
            AnalyticProjectMembershipPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const [row] = parsed.data;
        const data = (row?.data ?? []).map(item => ({
            projectId: item._id,
            count: item.count,
        }));

        return this.paginationOffsetUtil.page(
            data,
            row?.total[0]?.n ?? 0,
            params
        );
    }
}
