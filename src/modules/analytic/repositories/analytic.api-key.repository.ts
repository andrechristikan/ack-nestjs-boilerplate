import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IActivityLogAnalyticActionCount } from '@modules/activity-log/interfaces/activity-log.interface';
import { AnalyticApiKeyActiveExpiredPipelineSchema } from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticApiKeyRepository } from '@modules/analytic/interfaces/analytic.api-key-repository.interface';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticCountBucket,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticApiKeyRepository implements IAnalyticApiKeyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async groupLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticActionCount[]> {
        const rows = await this.databaseService.client.activityLog.groupBy({
            by: ['action'],
            where: {
                action: {
                    in: [
                        EnumActivityLogAction.adminApiKeyCreate,
                        EnumActivityLogAction.adminApiKeyReset,
                        EnumActivityLogAction.adminApiKeyUpdate,
                        EnumActivityLogAction.adminApiKeyUpdateDate,
                        EnumActivityLogAction.adminApiKeyUpdateStatus,
                        EnumActivityLogAction.adminApiKeyDelete,
                    ],
                },
                createdAt: { gte: startDate, lt: endDate },
            },
            _count: { _all: true },
        });

        return rows.map(row => ({
            action: row.action,
            count: row._count._all,
        }));
    }

    async findActiveExpired(now: Date): Promise<IAnalyticApiKeyActiveExpired> {
        const nowDate = this.analyticPipelineUtil.toDate(now);
        const result = await this.databaseService.client.apiKey.aggregateRaw({
            pipeline: [
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

    async groupType(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.apiKey.groupBy({
            by: ['type'],
            _count: { _all: true },
        });

        return rows.map(row => ({ key: row.type, count: row._count._all }));
    }
}
