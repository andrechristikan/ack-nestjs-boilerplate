import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumDevicePlatform, Prisma } from '@generated/prisma-client/client';
import {
    DeviceCursorAvailableOrderBy,
    DeviceDefaultAvailableOrderBy,
} from '@modules/device/constants/device.list.constant';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import type {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import { DeviceHttpService } from '@modules/device/services/device.http.service';

describe('DeviceHttpService', () => {
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const params = { skip: 0, limit: 20, orderBy: [] };
    const storePatch = { availableOrderBy: DeviceDefaultAvailableOrderBy };
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
            notificationToken: null,
            notificationProvider: null,
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

    let service: DeviceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceHttpService,
                { provide: DeviceDomain, useValue: deviceDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(DeviceHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('enriches each row with a resting isCurrentDevice and merges the isRevoked filter', async () => {
            const query: DeviceAdminListRequestDto = { isRevoked: true };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: { isRevoked: { equals: true } },
                storeFilter: { isRevoked: true },
            });
            deviceDomain.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [deviceOwnership],
            });

            const result = await service.getListOffsetByAdmin('user-1', query);

            expect(result.data).toEqual([
                {
                    ...deviceOwnership,
                    activeSessionCount: 2,
                    isCurrentDevice: false,
                },
            ]);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: DeviceDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: { isRevoked: true } }
            );
            expect(deviceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                { isRevoked: { equals: true } }
            );
        });

        it('merges an empty filter object when isRevoked is not given', async () => {
            const query: DeviceAdminListRequestDto = {};
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
            deviceDomain.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [],
            });

            await service.getListOffsetByAdmin('user-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(deviceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                undefined
            );
        });
    });

    describe('getListCursor', () => {
        it('marks isCurrentDevice true when the row carries a live session', async () => {
            const query: DeviceSharedListRequestDto = {};
            const withSession: IDeviceOwnershipWithSession = {
                ...deviceOwnership,
                sessions: [{ id: 'session-1' }],
            };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            deviceDomain.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [withSession],
            });

            const result = await service.getListCursor(
                'user-1',
                'session-1',
                query
            );

            expect(result.data).toEqual([
                {
                    ...withSession,
                    activeSessionCount: 2,
                    isCurrentDevice: true,
                },
            ]);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: DeviceCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(deviceDomain.getListCursor).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                params
            );
        });

        it('marks isCurrentDevice false when the row carries no live session', async () => {
            const query: DeviceSharedListRequestDto = {};
            const withoutSession: IDeviceOwnershipWithSession = {
                ...deviceOwnership,
                sessions: [],
            };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            deviceDomain.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [withoutSession],
            });

            const result = await service.getListCursor(
                'user-1',
                'session-1',
                query
            );

            expect(result.data).toEqual([
                {
                    ...withoutSession,
                    activeSessionCount: 2,
                    isCurrentDevice: false,
                },
            ]);
        });
    });

    describe('refresh', () => {
        it('forwards the refresh body to the domain and returns an empty response', async () => {
            const body: DeviceRefreshRequestDto = { name: 'iPhone 13' };
            deviceDomain.refresh.mockResolvedValue(undefined);

            const result = await service.refresh(
                'user-1',
                'device-ownership-1',
                body
            );

            expect(result).toEqual({});
            expect(deviceDomain.refresh).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                body
            );
        });
    });

    describe('remove', () => {
        it('forwards the removal to the domain and returns an empty response', async () => {
            deviceDomain.remove.mockResolvedValue(undefined);

            const result = await service.remove('user-1', 'device-ownership-1');

            expect(result).toEqual({});
            expect(deviceDomain.remove).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1'
            );
        });
    });

    describe('removeByAdmin', () => {
        it('forwards the admin removal to the domain and returns an empty response', async () => {
            deviceDomain.removeByAdmin.mockResolvedValue(undefined);

            const result = await service.removeByAdmin(
                'user-1',
                'device-ownership-1',
                'admin-1'
            );

            expect(result).toEqual({});
            expect(deviceDomain.removeByAdmin).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                'admin-1'
            );
        });
    });
});
