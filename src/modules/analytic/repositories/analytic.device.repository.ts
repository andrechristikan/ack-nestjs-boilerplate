import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import {
    AnalyticCountRanges,
    AnalyticDevicePerUserPipelineSchema,
    AnalyticDeviceSessionRatioPipelineSchema,
} from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticDeviceRepository } from '@modules/analytic/interfaces/analytic.device-repository.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticDevicePushTokenCount,
    IAnalyticSessionDeviceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineUtil } from '@modules/analytic/utils/analytic.pipeline.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticDeviceRepository implements IAnalyticDeviceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly analyticPipelineUtil: AnalyticPipelineUtil
    ) {}

    async countRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.device.count({
            where: { createdAt: { gte: startDate, lt: endDate } },
        });
    }

    async groupPlatform(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.device.groupBy({
            by: ['platform'],
            _count: { _all: true },
        });

        return rows.map(row => ({ key: row.platform, count: row._count._all }));
    }

    async countPushToken(): Promise<IAnalyticDevicePushTokenCount> {
        const result =
            await this.databaseService.client.deviceOwnership.aggregate({
                where: { isRevoked: false },
                _count: { _all: true, notificationToken: true },
            });

        return {
            total: result._count._all,
            withToken: result._count.notificationToken,
        };
    }

    async countInfoRefresh(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.activityLog.count({
            where: {
                action: EnumActivityLogAction.userDeviceRefresh,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async findSessionRatioCounts(
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticSessionDeviceCount> {
        const nowDate = this.analyticPipelineUtil.toDate(now);
        const idleSinceDate = this.analyticPipelineUtil.toDate(idleSince);
        const result = await this.databaseService.client.session.aggregateRaw({
            pipeline: [
                {
                    $match: {
                        isRevoked: false,
                        expiredAt: { $gt: nowDate },
                        lastActiveAt: { $gte: idleSinceDate },
                    },
                },
                { $count: 'sessions' },
                {
                    $unionWith: {
                        coll: 'DeviceOwnerships',
                        pipeline: [
                            { $match: { isRevoked: false } },
                            { $count: 'devices' },
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        sessions: { $sum: '$sessions' },
                        devices: { $sum: '$devices' },
                    },
                },
            ],
        });
        const parsed =
            AnalyticDeviceSessionRatioPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        return parsed.data[0] ?? { sessions: 0, devices: 0 };
    }

    async groupPerUser(): Promise<IAnalyticCountBucket[]> {
        const lastIndex = AnalyticCountRanges.length - 1;
        const defaultKey = AnalyticCountRanges[lastIndex]!.key;
        const result =
            await this.databaseService.client.deviceOwnership.aggregateRaw({
                pipeline: [
                    { $match: { isRevoked: false } },
                    { $group: { _id: '$userId', devices: { $sum: 1 } } },
                    {
                        $bucket: {
                            groupBy: '$devices',
                            boundaries: AnalyticCountRanges.map(
                                range => range.min
                            ),
                            default: defaultKey,
                            output: { count: { $sum: 1 } },
                        },
                    },
                ],
            });
        const parsed = AnalyticDevicePerUserPipelineSchema.safeParse(result);
        if (!parsed.success) {
            throw new AppUnknownException(parsed.error);
        }

        const countById = new Map(parsed.data.map(row => [row._id, row.count]));

        return AnalyticCountRanges.map((range, index) => ({
            key: range.key,
            count:
                countById.get(index === lastIndex ? range.key : range.min) ?? 0,
        }));
    }

    async countInactive(before: Date): Promise<number> {
        return this.databaseService.client.deviceOwnership.count({
            where: { isRevoked: false, lastActiveAt: { lt: before } },
        });
    }
}
