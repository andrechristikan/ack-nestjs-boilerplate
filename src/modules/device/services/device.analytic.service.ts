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
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceAnalyticService {
    constructor(
        private readonly deviceOwnershipAnalyticRepository: DeviceOwnershipAnalyticRepository,
        private readonly deviceAnalyticRepository: DeviceAnalyticRepository,
        private readonly deviceUtil: DeviceUtil,
        private readonly helperNumberService: HelperNumberService
    ) {}

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
        return this.deviceUtil.findProliferationOutliers(
            counts,
            zScoreThreshold
        );
    }
}
