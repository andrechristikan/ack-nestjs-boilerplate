import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticDeviceProliferationResult } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticMetricRate,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IDeviceOwnershipAnalyticUserCount } from '@modules/device/interfaces/device.interface';
import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceAnalyticService {
    constructor(
        private readonly deviceOwnershipAnalyticRepository: DeviceOwnershipAnalyticRepository,
        private readonly deviceAnalyticRepository: DeviceAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    private findProliferationOutliers(
        counts: IDeviceOwnershipAnalyticUserCount[],
        zScoreThreshold: number
    ): IAnalyticDeviceProliferationResult {
        if (counts.length === 0) {
            return { count: 0, avg: 0, stdDev: 0, rows: [] };
        }
        const avg = counts.reduce((s, c) => s + c.count, 0) / counts.length;
        const variance =
            counts.reduce((s, c) => s + (c.count - avg) ** 2, 0) /
            counts.length;
        const stdDev = Math.sqrt(variance);
        const rows = counts
            .map(c => ({
                userId: c.userId,
                deviceCount: c.count,
                zScore: stdDev === 0 ? 0 : (c.count - avg) / stdDev,
            }))
            .filter(r => r.zScore > zScoreThreshold)
            .sort((a, b) => b.deviceCount - a.deviceCount);

        return { count: rows.length, avg, stdDev, rows };
    }

    async getCountRegistrations(
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return await this.deviceAnalyticRepository.countRegistrations(
            startDate,
            endDate
        );
    }

    async getGroupByPlatform(): Promise<IAnalyticCountBucket[]> {
        return await this.deviceAnalyticRepository.groupByPlatform();
    }

    async getPushTokenRate(): Promise<IAnalyticMetricRate> {
        const [withToken, total] = await Promise.all([
            this.deviceAnalyticRepository.countWithPushToken(),
            this.deviceAnalyticRepository.countDevices(),
        ]);
        const rate = this.helperNumberService.percent(withToken, total);
        return { count: withToken, total, rate };
    }

    async getCountOwnerships(): Promise<number> {
        return await this.deviceOwnershipAnalyticRepository.countOwnerships();
    }

    async getCountDevices(): Promise<number> {
        return await this.deviceAnalyticRepository.countDevices();
    }

    async getCountPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]> {
        return await this.deviceOwnershipAnalyticRepository.countPerUser();
    }

    async getCountInactive(before: Date): Promise<number> {
        return await this.deviceOwnershipAnalyticRepository.countInactive(
            before
        );
    }

    async existsCreatedInRangeByUser(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<boolean> {
        return await this.deviceOwnershipAnalyticRepository.existsCreatedInRangeByUser(
            userId,
            startDate,
            endDate
        );
    }

    async getSharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprint[]> {
        return await this.deviceOwnershipAnalyticRepository.findSharedFingerprints(
            minUsers
        );
    }

    async getProliferationOutliers(
        zScoreThreshold: number
    ): Promise<IAnalyticDeviceProliferationResult> {
        const counts = await this.getCountPerUser();
        return this.findProliferationOutliers(counts, zScoreThreshold);
    }
}
