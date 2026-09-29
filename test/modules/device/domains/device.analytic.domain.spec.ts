import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';
import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';

describe('DeviceAnalyticDomain', () => {
    const deviceOwnershipAnalyticRepository: MockProxy<DeviceOwnershipAnalyticRepository> =
        mock<DeviceOwnershipAnalyticRepository>();
    const deviceAnalyticRepository: MockProxy<DeviceAnalyticRepository> =
        mock<DeviceAnalyticRepository>();

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
            ],
        }).compile();

        domain = module.get(DeviceAnalyticDomain);
    });

    describe('countRegistrations', () => {
        it('delegates to the device analytic repository', async () => {
            deviceAnalyticRepository.countRegistrations.mockResolvedValue(9);

            const result = await domain.countRegistrations(startDate, endDate);

            expect(result).toBe(9);
            expect(
                deviceAnalyticRepository.countRegistrations
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('groupByPlatform', () => {
        it('delegates to the device analytic repository', async () => {
            const rows = [{ key: 'ios', count: 4 }];
            deviceAnalyticRepository.groupByPlatform.mockResolvedValue(rows);

            const result = await domain.groupByPlatform();

            expect(result).toBe(rows);
        });
    });

    describe('pushTokenRate', () => {
        it('divides devices with a push token by the total device count', async () => {
            deviceAnalyticRepository.countWithPushToken.mockResolvedValue(4);
            deviceAnalyticRepository.countDevices.mockResolvedValue(10);

            const result = await domain.pushTokenRate();

            expect(result).toEqual({ count: 4, total: 10, rate: 40 });
        });

        it('returns a zero rate when no devices exist', async () => {
            deviceAnalyticRepository.countWithPushToken.mockResolvedValue(0);
            deviceAnalyticRepository.countDevices.mockResolvedValue(0);

            const result = await domain.pushTokenRate();

            expect(result).toEqual({ count: 0, total: 0, rate: 0 });
        });
    });

    describe('countOwnerships', () => {
        it('delegates to the ownership analytic repository', async () => {
            deviceOwnershipAnalyticRepository.countOwnerships.mockResolvedValue(
                6
            );

            const result = await domain.countOwnerships();

            expect(result).toBe(6);
        });
    });

    describe('countDevices', () => {
        it('delegates to the device analytic repository', async () => {
            deviceAnalyticRepository.countDevices.mockResolvedValue(12);

            const result = await domain.countDevices();

            expect(result).toBe(12);
        });
    });

    describe('countPerUser', () => {
        it('delegates to the ownership analytic repository', async () => {
            const rows = [{ userId: 'user-1', count: 3 }];
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue(
                rows
            );

            const result = await domain.countPerUser();

            expect(result).toBe(rows);
        });
    });

    describe('findInactive', () => {
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

            const result = await domain.findInactive(startDate);

            expect(result).toBe(rows);
            expect(
                deviceOwnershipAnalyticRepository.findInactive
            ).toHaveBeenCalledWith(startDate);
        });
    });

    describe('findCreatedInRange', () => {
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

            const result = await domain.findCreatedInRange(startDate, endDate);

            expect(result).toBe(rows);
            expect(
                deviceOwnershipAnalyticRepository.findCreatedInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('sharedFingerprints', () => {
        it('delegates to the ownership analytic repository with the minimum user count', async () => {
            const rows = [
                { fingerprint: 'abc123', userCount: 3, userIds: ['user-1'] },
            ];
            deviceOwnershipAnalyticRepository.sharedFingerprints.mockResolvedValue(
                rows
            );

            const result = await domain.sharedFingerprints(2);

            expect(result).toBe(rows);
            expect(
                deviceOwnershipAnalyticRepository.sharedFingerprints
            ).toHaveBeenCalledWith(2);
        });
    });

    describe('proliferationOutliers', () => {
        it('returns a zero result when no user carries a device', async () => {
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue(
                []
            );

            const result = await domain.proliferationOutliers(2);

            expect(result).toEqual({
                count: 0,
                avg: 0,
                stdDev: 0,
                rows: [],
            });
        });

        it('flags and sorts users whose device count crosses the z-score threshold, highest first', async () => {
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue([
                { userId: 'user-1', count: 1 },
                { userId: 'user-2', count: 1 },
                { userId: 'user-3', count: 10 },
                { userId: 'user-4', count: 8 },
            ]);

            const result = await domain.proliferationOutliers(0.5);

            expect(result.count).toBe(2);
            expect(result.rows).toEqual([
                {
                    userId: 'user-3',
                    deviceCount: 10,
                    zScore: expect.any(Number),
                },
                {
                    userId: 'user-4',
                    deviceCount: 8,
                    zScore: expect.any(Number),
                },
            ]);
        });

        it('scores every user zero when every user carries the same device count', async () => {
            deviceOwnershipAnalyticRepository.countPerUser.mockResolvedValue([
                { userId: 'user-1', count: 2 },
                { userId: 'user-2', count: 2 },
            ]);

            const result = await domain.proliferationOutliers(-1);

            expect(result.rows).toEqual([
                { userId: 'user-1', deviceCount: 2, zScore: 0 },
                { userId: 'user-2', deviceCount: 2, zScore: 0 },
            ]);
        });
    });
});
