import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';

describe('DeviceRemoveUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
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
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
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

        it('revokes the sessions then removes the ownership on one transaction attributed to the owner, purges after commit, and stages the owner activity', async () => {
            const calls: string[] = [];
            helperDateService.create.mockReturnValue(updatedAt);
            sessionService.revokeByDeviceOwnershipInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revokedSessions;
                }
            );
            deviceService.removeOwnershipInTx.mockImplementation(async () => {
                calls.push('removeOwnership');

                return deviceOwnership;
            });
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
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
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                updatedAt
            );
            expect(deviceService.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                updatedAt
            );
            expect(calls).toEqual([
                'begin',
                'revokeSessions',
                'removeOwnership',
                'commit',
                'purge',
            ]);
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

        it('answers DeviceNotFoundException from the guarded removal of an already removed ownership, purging and staging nothing', async () => {
            const notFound = new DeviceNotFoundException();
            helperDateService.create.mockReturnValue(updatedAt);
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            deviceService.removeOwnershipInTx.mockRejectedValue(notFound);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            await expect(
                useCase.execute('user-1', 'device-ownership-1')
            ).rejects.toBe(notFound);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers DeviceNotFoundException when a concurrent removal wins the write', async () => {
            const conflict = new Error('write conflict');
            helperDateService.create.mockReturnValue(updatedAt);
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute('user-1', 'device-ownership-1')
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                messagePath: 'device.error.notFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('purges and stages nothing when the transaction fails', async () => {
            const cause = new Error('database exploded');
            helperDateService.create.mockReturnValue(updatedAt);
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute('user-1', 'device-ownership-1')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
