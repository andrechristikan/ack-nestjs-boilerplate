import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IDeviceAnalyticRepository } from '@modules/device/interfaces/device.analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceAnalyticRepository implements IDeviceAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.device.count({
            where: { createdAt: { gte: startDate, lt: endDate } },
        });
    }

    async groupByPlatform(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.device.groupBy({
            by: ['platform'],
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.platform, count: r._count._all }));
    }

    async countWithPushToken(): Promise<number> {
        return this.databaseService.client.device.count({
            where: { notificationToken: { not: null } },
        });
    }

    async countDevices(): Promise<number> {
        return this.databaseService.client.device.count();
    }
}
