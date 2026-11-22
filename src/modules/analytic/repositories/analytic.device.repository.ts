import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { AnalyticCountRanges } from '@modules/analytic/constants/analytic.constant';
import type { IAnalyticDeviceRepository } from '@modules/analytic/interfaces/analytic.device-repository.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticDevicePushTokenCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticDevicePerUserPipelineSchema } from '@modules/analytic/dtos/analytic.device-per-user-pipeline.dto';

@Injectable()
export class AnalyticDeviceRepository implements IAnalyticDeviceRepository {
    constructor(private readonly databaseService: DatabaseService) {}

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
