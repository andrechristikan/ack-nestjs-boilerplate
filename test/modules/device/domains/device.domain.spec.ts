import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Test, type TestingModule } from '@nestjs/testing';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('DeviceDomain', () => {
    const deviceOwnershipRepository = {
        findActiveWithPaginationCursor:
            vi.fn<
                DeviceOwnershipRepository['findActiveWithPaginationCursor']
            >(),
        existsActive: vi.fn<DeviceOwnershipRepository['existsActive']>(),
        touchInTx: vi.fn<DeviceOwnershipRepository['touchInTx']>(),
        removeOwnershipInTx:
            vi.fn<DeviceOwnershipRepository['removeOwnershipInTx']>(),
    } satisfies Pick<
        DeviceOwnershipRepository,
        | 'findActiveWithPaginationCursor'
        | 'existsActive'
        | 'touchInTx'
        | 'removeOwnershipInTx'
    >;
    const sessionService = {
        purgeRevokedLogins: vi.fn<SessionDomain['purgeRevokedLogins']>(),
        revokeByDeviceOwnershipInTx:
            vi.fn<SessionDomain['revokeByDeviceOwnershipInTx']>(),
    } satisfies Pick<
        SessionDomain,
        'purgeRevokedLogins' | 'revokeByDeviceOwnershipInTx'
    >;
    const deviceRepository = createMock<DeviceRepository>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createDatabaseServiceMock();
    const helperDateService = createMock<HelperDateService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const ownership = {
        id: 'ownership-id',
        deviceId: 'device-id',
        userId: 'user-id',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        device: {
            id: 'device-id',
            fingerprint: 'fingerprint',
            name: 'Browser',
            platform: EnumDevicePlatform.web,
            lastActiveAt: now,
            notificationToken: null,
            notificationProvider: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        user: {
            id: 'user-id',
            name: 'User',
            username: 'user',
            photo: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
        revokedBy: null,
        _count: { sessions: 2 },
    } satisfies IDeviceOwnership;

    let service: DeviceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        helperDateService.create.mockReturnValue(now);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceDomain,
                {
                    provide: DeviceOwnershipRepository,
                    useValue: deviceOwnershipRepository,
                },
                { provide: DeviceRepository, useValue: deviceRepository },
                { provide: SessionDomain, useValue: sessionService },
                { provide: DeviceUtil, useValue: new DeviceUtil() },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = moduleRef.get(DeviceDomain);
    });

    it('delegates the active ownership list with the current session excluded', async () => {
        const pagination = { limit: 20, cursorField: 'id' };
        const page = {
            type: EnumPaginationType.cursor,
            data: [],
            perPage: 20,
            hasNext: false,
        } satisfies IResponsePaginationReturn<IDeviceOwnershipWithSession>;
        deviceOwnershipRepository.findActiveWithPaginationCursor.mockResolvedValue(
            page
        );

        await expect(
            service.getListCursor('user-id', 'current-session', pagination)
        ).resolves.toBe(page);
        expect(
            deviceOwnershipRepository.findActiveWithPaginationCursor
        ).toHaveBeenCalledWith('user-id', 'current-session', pagination);
    });

    it('rejects refreshInTx when the ownership is not active for the user', async () => {
        deviceOwnershipRepository.existsActive.mockResolvedValue(false);

        await expect(
            service.refresh('user-id', 'foreign-ownership', {
                platform: EnumDevicePlatform.ios,
            })
        ).rejects.toBeInstanceOf(DeviceNotFoundException);
        expect(deviceOwnershipRepository.touchInTx).not.toHaveBeenCalled();
    });

    it('refreshes an owned device with the platform notification provider', async () => {
        deviceOwnershipRepository.existsActive.mockResolvedValue(true);
        const update = {
            name: 'Phone',
            platform: EnumDevicePlatform.ios,
            notificationToken: 'push-token',
        };
        deviceOwnershipRepository.touchInTx.mockResolvedValue('device-id');

        await expect(
            service.refresh('user-id', ownership.id, update)
        ).resolves.toBeUndefined();
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.userDeviceRefresh,
        });
        expect(deviceRepository.refreshInTx).toHaveBeenCalledWith(
            expect.any(Object),
            'device-id',
            update,
            EnumDeviceNotificationProvider.apns,
            expect.any(Date)
        );
    });

    it('invalidates device sessions before self-removal', async () => {
        deviceOwnershipRepository.existsActive.mockResolvedValue(true);
        const order: string[] = [];
        sessionService.revokeByDeviceOwnershipInTx.mockImplementation(
            async () => {
                order.push('sessions');
                return [];
            }
        );
        deviceOwnershipRepository.removeOwnershipInTx.mockImplementation(
            async () => {
                order.push('ownership');
                return ownership;
            }
        );

        await service.remove('user-id', ownership.id);

        expect(order).toEqual(['sessions', 'ownership']);
        expect(
            deviceOwnershipRepository.removeOwnershipInTx
        ).toHaveBeenCalledWith(
            expect.any(Object),
            'user-id',
            ownership.id,
            'user-id',
            expect.any(Date)
        );
    });

    it('invalidates sessions and records metadata for administrator removal', async () => {
        deviceOwnershipRepository.existsActive.mockResolvedValue(true);
        sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([
            { id: 'session-1' },
            { id: 'session-2' },
        ]);
        deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
            ownership
        );
        await service.removeByAdmin('user-id', ownership.id, 'admin-id');

        expect(sessionService.revokeByDeviceOwnershipInTx).toHaveBeenCalledWith(
            expect.any(Object),
            'user-id',
            ownership.id,
            'admin-id',
            expect.any(Date)
        );
        expect(
            deviceOwnershipRepository.removeOwnershipInTx
        ).toHaveBeenCalledWith(
            expect.any(Object),
            'user-id',
            ownership.id,
            'admin-id',
            expect.any(Date)
        );
        const metadata = {
            deviceOwnershipId: ownership.id,
            deviceId: ownership.device.id,
            targetUserId: ownership.userId,
            targetUsername: ownership.user.username,
            timestamp: ownership.updatedAt,
            sessionCount: ownership._count.sessions,
        };
        expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
            action: EnumActivityLogAction.adminDeviceRemove,
            metadata,
        });
        expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
            action: EnumActivityLogAction.userRemoveDeviceByAdmin,
            userId: 'user-id',
            createdBy: 'admin-id',
            metadata: {
                deviceOwnershipId: ownership.id,
                deviceId: ownership.device.id,
                actorUserId: 'admin-id',
                timestamp: ownership.updatedAt,
                sessionCount: ownership._count.sessions,
            },
        });
    });
});
