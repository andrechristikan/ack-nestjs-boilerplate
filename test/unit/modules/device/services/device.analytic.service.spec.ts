import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';

describe('DeviceAnalyticService', () => {
    const deviceOwnershipAnalyticRepository: MockProxy<DeviceOwnershipAnalyticRepository> =
        mock<DeviceOwnershipAnalyticRepository>();
    const deviceAnalyticRepository: MockProxy<DeviceAnalyticRepository> =
        mock<DeviceAnalyticRepository>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let service: DeviceAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceAnalyticService,
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

        service = module.get(DeviceAnalyticService);
    });

    describe('getCountRegistrations', () => {
        it('delegates to the device analytic repository', async () => {
            deviceAnalyticRepository.countRegistrations.mockResolvedValue(9);

            const result = await service.getCountRegistrations(
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

            const result = await service.getGroupByPlatform();

            expect(result).toBe(rows);
        });
    });

    describe('getPushTokenRate', () => {
        it('computes the rate from devices with a push token and the total device count', async () => {
            deviceAnalyticRepository.countWithPushToken.mockResolvedValue(4);
            deviceAnalyticRepository.countDevices.mockResolvedValue(10);
            helperNumberService.percent.mockReturnValue(40);

            const result = await service.getPushTokenRate();

            expect(result).toEqual({ count: 4, total: 10, rate: 40 });
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 10);
        });
    });

    describe('getCountOwnerships', () => {
        it('delegates to the ownership analytic repository', async () => {
            deviceOwnershipAnalyticRepository.countOwnerships.mockResolvedValue(
                6
            );

            const result = await service.getCountOwnerships();

            expect(result).toBe(6);
        });
    });

    describe('getCountDevices', () => {
        it('delegates to the device analytic repository', async () => {
            deviceAnalyticRepository.countDevices.mockResolvedValue(12);

            const result = await service.getCountDevices();

            expect(result).toBe(12);
        });
    });

    describe('getCountPerUser', () => {
        it('delegates to the ownership analytic repository', async () => {
            const rows = [{ userId: 'user-1', count: 3 }];
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue(
                rows
            );

            const result = await service.getCountPerUser();

            expect(result).toBe(rows);
        });
    });

    describe('getCountInactive', () => {
        it('delegates the inactive count to the ownership analytic repository with the cutoff date', async () => {
            deviceOwnershipAnalyticRepository.countInactive.mockResolvedValue(
                4
            );

            const result = await service.getCountInactive(startDate);

            expect(result).toBe(4);
            expect(
                deviceOwnershipAnalyticRepository.countInactive
            ).toHaveBeenCalledWith(startDate);
        });
    });

    describe('existsCreatedInRangeByUser', () => {
        it('forwards the user and window and returns the repository answer', async () => {
            deviceOwnershipAnalyticRepository.existsCreatedInRangeByUser.mockResolvedValue(
                true
            );

            const result = await service.existsCreatedInRangeByUser(
                'user-1',
                startDate,
                endDate
            );

            expect(result).toBe(true);
            expect(
                deviceOwnershipAnalyticRepository.existsCreatedInRangeByUser
            ).toHaveBeenCalledWith('user-1', startDate, endDate);
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

            const result = await service.getSharedFingerprints(2);

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

            const result = await service.getProliferationOutliers(2);

            expect(result).toBe(outliers);
            expect(deviceUtil.findProliferationOutliers).toHaveBeenCalledWith(
                counts,
                2
            );
        });
    });
});
