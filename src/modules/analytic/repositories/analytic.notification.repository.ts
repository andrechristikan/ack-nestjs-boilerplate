import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticNotificationDelivery } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticNotificationRepository } from '@modules/analytic/interfaces/analytic.notification-repository.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';
import { AnalyticNotificationDeliveryPipelineSchema } from '@modules/analytic/dtos/analytic.notification-delivery-pipeline.dto';

@Injectable()
export class AnalyticNotificationRepository implements IAnalyticNotificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async groupDelivery(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticNotificationDelivery[]> {
        const start = this.analyticPipelineUtil.toDate(startDate);
        const end = this.analyticPipelineUtil.toDate(endDate);
        const result =
            await this.databaseService.client.notificationDelivery.aggregateRaw(
                {
                    pipeline: [
                        { $match: { createdAt: { $gte: start, $lt: end } } },
                        {
                            $group: {
                                _id: '$channel',
                                total: { $sum: 1 },
                                sent: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $ne: [
                                                    {
                                                        $ifNull: [
                                                            '$sentAt',
                                                            null,
                                                        ],
                                                    },
                                                    null,
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                failed: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            {
                                                                $ifNull: [
                                                                    '$sentAt',
                                                                    null,
                                                                ],
                                                            },
                                                            null,
                                                        ],
                                                    },
                                                    {
                                                        $ne: [
                                                            {
                                                                $ifNull: [
                                                                    '$processedAt',
                                                                    null,
                                                                ],
                                                            },
                                                            null,
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                pending: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            {
                                                                $ifNull: [
                                                                    '$sentAt',
                                                                    null,
                                                                ],
                                                            },
                                                            null,
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            {
                                                                $ifNull: [
                                                                    '$processedAt',
                                                                    null,
                                                                ],
                                                            },
                                                            null,
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                channel: '$_id',
                                total: 1,
                                sent: 1,
                                failed: 1,
                                pending: 1,
                            },
                        },
                        { $sort: { channel: 1 } },
                    ],
                }
            );
        const parsed =
            AnalyticNotificationDeliveryPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data;
    }
}
