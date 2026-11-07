import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumDevicePlatform, Prisma } from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import { DeviceGetListOffsetByAdminUseCase } from '@modules/device/use-cases/device.get-list-offset-by-admin.use-case';

describe('DeviceGetListOffsetByAdminUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const params = {
        skip: 0,
        limit: 20,
        orderBy: [],
        fingerprint: 'aaaaaaaaaaaaaaaa',
    };
    const storePatch = { perPage: 20 };
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
    let useCase: DeviceGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceGetListOffsetByAdminUseCase,
                { provide: DeviceService, useValue: deviceService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        useCase = module.get(DeviceGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('enriches each row with a resting isCurrentDevice and merges the isRevoked filter', async () => {
            const query: DeviceAdminListRequestDto = { isRevoked: true };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationFilterUtil.equalBoolean.mockReturnValue({
                where: { isRevoked: { equals: true } },
                storeFilter: { isRevoked: true },
            });
            deviceService.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [deviceOwnership],
            });

            const result = await useCase.execute('user-1', query);

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
            expect(paginationFilterUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: { isRevoked: true } }
            );
            expect(deviceService.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                { isRevoked: { equals: true } }
            );
        });

        it('merges an empty filter object when isRevoked is not given', async () => {
            const query: DeviceAdminListRequestDto = {};
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationFilterUtil.equalBoolean.mockReturnValue(null);
            deviceService.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [],
            });

            await useCase.execute('user-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(deviceService.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                undefined
            );
        });
    });
});
