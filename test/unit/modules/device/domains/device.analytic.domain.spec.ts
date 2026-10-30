import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';

describe('DeviceAnalyticDomain', () => {
    const deviceOwnershipAnalyticRepository: MockProxy<DeviceOwnershipAnalyticRepository> =
        mock<DeviceOwnershipAnalyticRepository>();
    const deviceAnalyticRepository: MockProxy<DeviceAnalyticRepository> =
        mock<DeviceAnalyticRepository>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let domain: DeviceAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceAnalyticDomain,
                {
                    provide: DeviceOwnershipAnalyticRepository,
                    useValue: deviceOwnershipAnalyticRepository,
                },
                {
                    provide: DeviceAnalyticRepository,
                    useValue: deviceAnalyticRepository,
                },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();

        domain = module.get(DeviceAnalyticDomain);
    });

    describe('getCountRegistrations', () => {
        it('delegates to the device analytic repository', async () => {
            deviceAnalyticRepository.countRegistrations.mockResolvedValue(9);

            const result = await domain.getCountRegistrations(
                startDate,
                endDate
            );

            expect(result).toBe(9);
            expect(
                deviceAnalyticRepository.countRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getGroupByPlatform', () => {
        it('delegates to the device analytic repository', async () => {
            const rows = [{ key: 'ios', count: 4 }];
            deviceAnalyticRepository.groupByPlatform.mockResolvedValue(rows);

            const result = await domain.getGroupByPlatform();

            expect(result).toBe(rows);
        });
    });

    describe('getPushTokenRate', () => {
        it('computes the rate from devices with a push token and the total device count', async () => {
            deviceAnalyticRepository.countWithPushToken.mockResolvedValue(4);
            deviceAnalyticRepository.countDevices.mockResolvedValue(10);
            helperNumberService.percent.mockReturnValue(40);

            const result = await domain.getPushTokenRate();

            expect(result).toEqual({ count: 4, total: 10, rate: 40 });
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 10);
        });
    });

    describe('getCountOwnerships', () => {
        it('delegates to the ownership analytic repository', async () => {
            deviceOwnershipAnalyticRepository.countOwnerships.mockResolvedValue(
                6
            );

            const result = await domain.getCountOwnerships();

            expect(result).toBe(6);
        });
    });

    describe('getCountDevices', () => {
        it('delegates to the device analytic repository', async () => {
            deviceAnalyticRepository.countDevices.mockResolvedValue(12);

            const result = await domain.getCountDevices();

            expect(result).toBe(12);
        });
    });

    describe('getCountPerUser', () => {
        it('delegates to the ownership analytic repository', async () => {
            const rows = [{ userId: 'user-1', count: 3 }];
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue(
                rows
            );

            const result = await domain.getCountPerUser();

            expect(result).toBe(rows);
        });
    });

    describe('getInactive', () => {
        it('delegates to the ownership analytic repository with the cutoff date', async () => {
            const rows = [
                {
                    id: 'ownership-1',
                    userId: 'user-1',
                    lastActiveAt: startDate,
                    deviceId: 'device-1',
                },
            ];
            deviceOwnershipAnalyticRepository.findInactive.mockResolvedValue(
                rows
            );

            const result = await domain.getInactive(startDate);

            expect(result).toBe(rows);
            expect(
                deviceOwnershipAnalyticRepository.findInactive
            ).toHaveBeenCalledWith(startDate);
        });
    });

    describe('getCreatedInRange', () => {
        it('delegates to the ownership analytic repository', async () => {
            const rows = [
                {
                    id: 'ownership-1',
                    userId: 'user-1',
                    deviceId: 'device-1',
                    createdAt: startDate,
                },
            ];
            deviceOwnershipAnalyticRepository.findCreatedInRange.mockResolvedValue(
                rows
            );

            const result = await domain.getCreatedInRange(startDate, endDate);

            expect(result).toBe(rows);
            expect(
                deviceOwnershipAnalyticRepository.findCreatedInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('getSharedFingerprints', () => {
        it('delegates to the ownership analytic repository with the minimum user count', async () => {
            const rows = [
                { fingerprint: 'abc123', userCount: 3, userIds: ['user-1'] },
            ];
            deviceOwnershipAnalyticRepository.findSharedFingerprints.mockResolvedValue(
                rows
            );

            const result = await domain.getSharedFingerprints(2);

            expect(result).toBe(rows);
            expect(
                deviceOwnershipAnalyticRepository.findSharedFingerprints
            ).toHaveBeenCalledWith(2);
        });
    });

    describe('getProliferationOutliers', () => {
        it('reads the per-user counts and scores them through the util', async () => {
            const counts = [{ userId: 'user-1', count: 3 }];
            const outliers = { count: 0, avg: 3, stdDev: 0, rows: [] };
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue(
                counts
            );
            deviceUtil.findProliferationOutliers.mockReturnValue(outliers);

            const result = await domain.getProliferationOutliers(2);

            expect(result).toBe(outliers);
            expect(deviceUtil.findProliferationOutliers).toHaveBeenCalledWith(
                counts,
                2
            );
        });
    });
});
