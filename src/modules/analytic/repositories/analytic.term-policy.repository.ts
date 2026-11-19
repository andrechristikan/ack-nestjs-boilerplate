import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { AnalyticTermPolicyAcceptancePipelineSchema } from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticTermPolicyRepository } from '@modules/analytic/interfaces/analytic.term-policy-repository.interface';
import type {
    IAnalyticPipelineDate,
    IAnalyticTermPolicyAcceptanceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticTermPolicyRepository implements IAnalyticTermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async findAcceptanceCounts(
        types: EnumTermPolicyType[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceCount> {
        const range: {
            acceptedAt?: {
                $gte: IAnalyticPipelineDate;
                $lt: IAnalyticPipelineDate;
            };
        } = {};
        if (startDate !== null && endDate !== null) {
            const start = this.analyticPipelineUtil.toDate(startDate);
            const end = this.analyticPipelineUtil.toDate(endDate);
            range.acceptedAt = { $gte: start, $lt: end };
        }
        const result =
            await this.databaseService.client.termPolicy.aggregateRaw({
                pipeline: [
                    {
                        $match: {
                            type: { $in: types },
                            status: EnumTermPolicyStatus.published,
                        },
                    },
                    { $sort: { type: 1, version: -1 } },
                    { $group: { _id: '$type', id: { $first: '$_id' } } },
                    {
                        $lookup: {
                            from: 'TermPolicyUserAcceptances',
                            localField: 'id',
                            foreignField: 'termPolicyId',
                            pipeline: [{ $match: range }, { $count: 'n' }],
                            as: 'a',
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            published: { $sum: 1 },
                            acceptances: {
                                $sum: { $ifNull: [{ $first: '$a.n' }, 0] },
                            },
                        },
                    },
                    {
                        $unionWith: {
                            coll: 'Users',
                            pipeline: [
                                { $match: { deletedAt: null } },
                                { $count: 'users' },
                            ],
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            published: { $sum: '$published' },
                            acceptances: { $sum: '$acceptances' },
                            users: { $sum: '$users' },
                        },
                    },
                ],
            });
        const parsed =
            AnalyticTermPolicyAcceptancePipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data[0] ?? { published: 0, acceptances: 0, users: 0 };
    }
}
