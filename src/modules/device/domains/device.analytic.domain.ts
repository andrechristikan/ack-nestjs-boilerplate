import type { IAnalyticDeviceProliferationResult } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticMetricRate,
} from '@modules/analytic/interfaces/analytic.interface';
import type {
    IDeviceOwnershipAnalyticCreated,
    IDeviceOwnershipAnalyticInactive,
    IDeviceOwnershipAnalyticUserCount,
} from '@modules/device/interfaces/device.interface';
import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceAnalyticDomain {
    constructor(
        private readonly deviceOwnershipAnalyticRepository: DeviceOwnershipAnalyticRepository,
        private readonly deviceAnalyticRepository: DeviceAnalyticRepository
    ) {}

    getCountRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.deviceAnalyticRepository.countRegistrations(
            startDate,
            endDate
        );
    }

    getGroupByPlatform(): Promise<IAnalyticCountBucket[]> {
        return this.deviceAnalyticRepository.groupByPlatform();
    }

    async getPushTokenRate(): Promise<IAnalyticMetricRate> {
        const [withToken, total] = await Promise.all([
            this.deviceAnalyticRepository.countWithPushToken(),
            this.deviceAnalyticRepository.countDevices(),
        ]);
        return {
            count: withToken,
            total,
            rate: total === 0 ? 0 : (withToken / total) * 100,
        };
    }

    getCountOwnerships(): Promise<number> {
        return this.deviceOwnershipAnalyticRepository.countOwnerships();
    }

    getCountDevices(): Promise<number> {
        return this.deviceAnalyticRepository.countDevices();
    }

    getCountPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]> {
        return this.deviceOwnershipAnalyticRepository.countPerUser();
    }

    getInactive(before: Date): Promise<IDeviceOwnershipAnalyticInactive[]> {
        return this.deviceOwnershipAnalyticRepository.findInactive(before);
    }

    getCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IDeviceOwnershipAnalyticCreated[]> {
        return this.deviceOwnershipAnalyticRepository.findCreatedInRange(
            startDate,
            endDate
        );
    }

    getSharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprint[]> {
        return this.deviceOwnershipAnalyticRepository.findSharedFingerprints(
            minUsers
        );
    }

    async getProliferationOutliers(
        zScoreThreshold: number
    ): Promise<IAnalyticDeviceProliferationResult> {
        const counts = await this.getCountPerUser();
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
}
