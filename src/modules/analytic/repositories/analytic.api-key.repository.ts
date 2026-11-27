import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticApiKeyRepository } from '@modules/analytic/interfaces/analytic.api-key-repository.interface';
import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';
import { AnalyticApiKeyActiveExpiredPipelineSchema } from '@modules/analytic/dtos/analytic.api-key-active-expired-pipeline.dto';

@Injectable()
export class AnalyticApiKeyRepository implements IAnalyticApiKeyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async findActiveExpired(now: Date): Promise<IAnalyticApiKeyActiveExpired> {
        const nowDate = this.analyticPipelineUtil.toDate(now);
        const result = await this.databaseService.client.apiKey.aggregateRaw({
            pipeline: [
                { $match: { deletedAt: null } },
                {
                    $group: {
                        _id: null,
                        active: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$isActive', true] },
                                            {
                                                $or: [
                                                    {
                                                        $eq: [
                                                            {
                                                                $ifNull: [
                                                                    '$endAt',
                                                                    null,
                                                                ],
                                                            },
                                                            null,
                                                        ],
                                                    },
                                                    {
                                                        $gte: [
                                                            '$endAt',
                                                            nowDate,
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        expired: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$isActive', true] },
                                            { $lt: ['$endAt', nowDate] },
                                            { $ne: ['$endAt', null] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        inactive: {
                            $sum: {
                                $cond: [{ $eq: ['$isActive', false] }, 1, 0],
                            },
                        },
                    },
                },
            ],
        });
        const parsed =
            AnalyticApiKeyActiveExpiredPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data[0] ?? { active: 0, expired: 0, inactive: 0 };
    }
}
