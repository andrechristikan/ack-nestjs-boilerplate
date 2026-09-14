import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
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
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionService } from '@modules/session/services/session.service';

describe('DeviceService', () => {
    const deviceOwnershipRepository = {
        findActiveWithPaginationCursor:
            vi.fn<
                DeviceOwnershipRepository['findActiveWithPaginationCursor']
            >(),
        existActive: vi.fn<DeviceOwnershipRepository['existActive']>(),
        refresh: vi.fn<DeviceOwnershipRepository['refresh']>(),
        remove: vi.fn<DeviceOwnershipRepository['remove']>(),
        removeByAdmin: vi.fn<DeviceOwnershipRepository['removeByAdmin']>(),
    } satisfies Pick<
        DeviceOwnershipRepository,
        | 'findActiveWithPaginationCursor'
        | 'existActive'
        | 'refresh'
        | 'remove'
        | 'removeByAdmin'
    >;
    const sessionService = {
        deleteLoginsByDeviceOwnership:
            vi.fn<SessionService['deleteLoginsByDeviceOwnership']>(),
    } satisfies Pick<SessionService, 'deleteLoginsByDeviceOwnership'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
        merge: vi.fn<RequestStoreService['merge']>(),
    } satisfies Pick<RequestStoreService, 'get' | 'merge'>;
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

    let service: DeviceService;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreGet.mockReturnValue(requestLog);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceService,
                {
                    provide: DeviceOwnershipRepository,
                    useValue: deviceOwnershipRepository,
                },
                { provide: SessionService, useValue: sessionService },
                DeviceUtil,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(DeviceService);
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

    it('rejects refresh when the ownership is not active for the user', async () => {
        deviceOwnershipRepository.existActive.mockResolvedValue(null);

        await expect(
            service.refresh('user-id', 'foreign-ownership', {
                platform: EnumDevicePlatform.ios,
            })
        ).rejects.toBeInstanceOf(DeviceNotFoundException);
        expect(deviceOwnershipRepository.refresh).not.toHaveBeenCalled();
    });

    it('refreshes an owned device with the platform notification provider', async () => {
        deviceOwnershipRepository.existActive.mockResolvedValue({
            id: ownership.id,
        });
        const update = {
            name: 'Phone',
            platform: EnumDevicePlatform.ios,
            notificationToken: 'push-token',
        };

        await expect(
            service.refresh('user-id', ownership.id, update)
        ).resolves.toBeUndefined();
        expect(requestStoreGet).toHaveBeenCalledWith(RequestLogStoreKey);
        expect(deviceOwnershipRepository.refresh).toHaveBeenCalledWith(
            'user-id',
            ownership.id,
            update,
            EnumDeviceNotificationProvider.apns,
            requestLog
        );
    });

    it('invalidates device sessions before self-removal', async () => {
        deviceOwnershipRepository.existActive.mockResolvedValue({
            id: ownership.id,
        });
        const order: string[] = [];
        sessionService.deleteLoginsByDeviceOwnership.mockImplementation(
            async () => {
                order.push('sessions');
            }
        );
        deviceOwnershipRepository.remove.mockImplementation(async () => {
            order.push('ownership');
            return ownership;
        });

        await service.remove('user-id', ownership.id);

        expect(order).toEqual(['sessions', 'ownership']);
        expect(deviceOwnershipRepository.remove).toHaveBeenCalledWith(
            'user-id',
            ownership.id,
            requestLog
        );
    });

    it('invalidates sessions and records metadata for administrator removal', async () => {
        deviceOwnershipRepository.existActive.mockResolvedValue({
            id: ownership.id,
        });
        deviceOwnershipRepository.removeByAdmin.mockResolvedValue(ownership);
        await service.removeByAdmin('user-id', ownership.id, 'admin-id');

        expect(
            sessionService.deleteLoginsByDeviceOwnership
        ).toHaveBeenCalledWith('user-id', ownership.id);
        expect(deviceOwnershipRepository.removeByAdmin).toHaveBeenCalledWith(
            'user-id',
            ownership.id,
            'admin-id',
            requestLog
        );
        expect(requestStoreService.merge).toHaveBeenCalled();
    });
});
