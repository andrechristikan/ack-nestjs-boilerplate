import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import type {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import { DeviceGetListCursorUseCase } from '@modules/device/use-cases/device.get-list-cursor.use-case';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('DeviceGetListCursorUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const updatedAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const params = {
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
        fingerprint: '5b94848c6a53aba0',
    };
    const storePatch = {
        perPage: 20,
        orderBy: 'latest',
        availableSearch: [],
        availableOrderBy: ['latest'],
    };
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
    const userContext = buildUserContext(
        buildUser('user-1', 'user@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: DeviceGetListCursorUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceGetListCursorUseCase,
                { provide: DeviceService, useValue: deviceService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        useCase = module.get(DeviceGetListCursorUseCase);
    });

    describe('execute', () => {
        it('marks isCurrentDevice true when the row carries a live session', async () => {
            const query: DeviceSharedListRequestDto = {};
            const withSession: IDeviceOwnershipWithSession = {
                ...deviceOwnership,
                sessions: [{ id: 'session-1' }],
            };
            deviceService.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [withSession],
            });

            const result = await useCase.execute(authContext, query);

            expect(result.data).toEqual([
                {
                    ...withSession,
                    activeSessionCount: 2,
                    isCurrentDevice: true,
                },
            ]);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(deviceService.getListCursor).toHaveBeenCalledWith(
                authContext.userId,
                authContext.sessionId,
                params
            );
        });

        it('marks isCurrentDevice false when the row carries no live session', async () => {
            const query: DeviceSharedListRequestDto = {};
            const withoutSession: IDeviceOwnershipWithSession = {
                ...deviceOwnership,
                sessions: [],
            };
            deviceService.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [withoutSession],
            });

            const result = await useCase.execute(authContext, query);

            expect(result.data).toEqual([
                {
                    ...withoutSession,
                    activeSessionCount: 2,
                    isCurrentDevice: false,
                },
            ]);
        });
    });
});
