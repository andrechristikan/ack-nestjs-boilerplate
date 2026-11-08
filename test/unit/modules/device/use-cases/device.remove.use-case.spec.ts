import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';

describe('DeviceRemoveUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const deviceOwnership: IDeviceOwnership = {
        id: 'device-ownership-1',
        createdAt: updatedAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        deviceId: 'device-1',
        userId: 'user-1',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: updatedAt,
        notificationToken: null,
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        device: {
            id: 'device-1',
            createdAt: updatedAt,
            createdBy: 'user-1',
            updatedAt,
            updatedBy: 'user-1',
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: 'iPhone 12',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: updatedAt,
        },
        user: {
            id: 'user-1',
            createdAt: updatedAt,
            createdBy: 'user-1',
            updatedAt,
            updatedBy: 'user-1',
            deletedAt: null,
            deletedBy: null,
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
        },
        revokedBy: null,
        _count: { sessions: 2 },
    };
    let useCase: DeviceRemoveUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRemoveUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DeviceUtil, useValue: deviceUtil },
            ],
        }).compile();

        useCase = module.get(DeviceRemoveUseCase);
    });

    describe('execute', () => {
        const revokedSessions = [{ id: 'session-1' }];
        const metadata = {
            deviceOwnershipId: 'device-ownership-1',
            deviceId: 'device-1',
            sessionCount: 1,
        };
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userRemoveDevice,
            metadata,
            userId: 'user-1',
            createdBy: 'user-1',
            workspaceId: null,
        };

        it('removes the ownership as the owner, purges after the removal, and stages the owner activity', async () => {
            const calls: string[] = [];
            sessionService.removeDeviceOwnership.mockImplementation(
                async () => {
                    calls.push('remove');

                    return { deviceOwnership, revokedSessions };
                }
            );
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });
            deviceUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            activityLogService.prepare.mockReturnValue(activityLog);

            const result = await useCase.execute(
                'user-1',
                'device-ownership-1'
            );

            expect(result).toEqual({});
            expect(sessionService.removeDeviceOwnership).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                'user-1'
            );
            expect(calls).toEqual(['remove', 'purge']);
            expect(deviceUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                deviceOwnership,
                1
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRemoveDevice,
                userId: 'user-1',
                createdBy: 'user-1',
                metadata,
            });
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                revokedSessions
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('purges and stages nothing when the removal throws', async () => {
            const notFound = new DeviceNotFoundException();
            sessionService.removeDeviceOwnership.mockRejectedValue(notFound);

            await expect(
                useCase.execute('user-1', 'device-ownership-1')
            ).rejects.toBe(notFound);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
