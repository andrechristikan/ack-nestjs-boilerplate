import { HelperNumberService } from '@common/helper/services/helper.number.service';
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
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceAnalyticDomain {
    constructor(
        private readonly deviceOwnershipAnalyticRepository: DeviceOwnershipAnalyticRepository,
        private readonly deviceAnalyticRepository: DeviceAnalyticRepository,
        private readonly deviceUtil: DeviceUtil,
        private readonly helperNumberService: HelperNumberService
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
        const rate = this.helperNumberService.percent(withToken, total);
        return { count: withToken, total, rate };
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
        return this.deviceUtil.findProliferationOutliers(
            counts,
            zScoreThreshold
        );
    }
}
