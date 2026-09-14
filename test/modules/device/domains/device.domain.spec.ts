import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Test, type TestingModule } from '@nestjs/testing';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
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
        refreshInTx: vi.fn<DeviceOwnershipRepository['refreshInTx']>(),
        removeOwnershipInTx:
            vi.fn<DeviceOwnershipRepository['removeOwnershipInTx']>(),
    } satisfies Pick<
        DeviceOwnershipRepository,
        | 'findActiveWithPaginationCursor'
        | 'existsActive'
        | 'refreshInTx'
        | 'removeOwnershipInTx'
    >;
    const sessionService = {
        deleteLoginsByDeviceOwnership:
            vi.fn<SessionDomain['deleteLoginsByDeviceOwnership']>(),
        revokeByDeviceOwnershipInTx:
            vi.fn<SessionDomain['revokeByDeviceOwnershipInTx']>(),
    } satisfies Pick<
        SessionDomain,
        'deleteLoginsByDeviceOwnership' | 'revokeByDeviceOwnershipInTx'
    >;
    const activityLogDomain = createMock<ActivityLogDomain>();
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
        merge: vi.fn<RequestStoreService['merge']>(),
    } satisfies Pick<RequestStoreService, 'get' | 'merge'>;
    const databaseService = createDatabaseServiceMock();
    const helperDateService = createMock<HelperDateService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
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
        requestStoreGet.mockReturnValue(requestLog);
        helperDateService.create.mockReturnValue(now);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceDomain,
                {
                    provide: DeviceOwnershipRepository,
                    useValue: deviceOwnershipRepository,
                },
                { provide: SessionDomain, useValue: sessionService },
                { provide: DeviceUtil, useValue: new DeviceUtil() },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
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
        } satisfies IResponsePagingReturn<IDeviceOwnershipWithSession>;
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
        expect(deviceOwnershipRepository.refreshInTx).not.toHaveBeenCalled();
    });

    it('refreshes an owned device with the platform notification provider', async () => {
        deviceOwnershipRepository.existsActive.mockResolvedValue(true);
        const update = {
            name: 'Phone',
            platform: EnumDevicePlatform.ios,
            notificationToken: 'push-token',
        };

        await expect(
            service.refresh('user-id', ownership.id, update)
        ).resolves.toBeUndefined();
        expect(requestStoreGet).toHaveBeenCalledWith(RequestLogStoreKey);
        expect(deviceOwnershipRepository.refreshInTx).toHaveBeenCalledWith(
            expect.any(Object),
            'user-id',
            ownership.id,
            update,
            EnumDeviceNotificationProvider.apns,
            expect.any(Date)
        );
    });

    it('invalidates device sessions before self-removal', async () => {
        deviceOwnershipRepository.existsActive.mockResolvedValue(true);
        const order: string[] = [];
        sessionService.deleteLoginsByDeviceOwnership.mockImplementation(
            async () => {
                order.push('sessions');
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
        deviceOwnershipRepository.removeOwnershipInTx.mockResolvedValue(
            ownership
        );
        await service.removeByAdmin('user-id', ownership.id, 'admin-id');

        expect(
            sessionService.deleteLoginsByDeviceOwnership
        ).toHaveBeenCalledWith('user-id', ownership.id);
        expect(
            deviceOwnershipRepository.removeOwnershipInTx
        ).toHaveBeenCalledWith(
            expect.any(Object),
            'user-id',
            ownership.id,
            'admin-id',
            expect.any(Date)
        );
        expect(requestStoreService.merge).toHaveBeenCalled();
    });
});
