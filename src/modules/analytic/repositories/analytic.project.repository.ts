import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { AnalyticProjectCreationPipelineSchema } from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticProjectRepository } from '@modules/analytic/interfaces/analytic.project-repository.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticProjectRepository implements IAnalyticProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
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
}
