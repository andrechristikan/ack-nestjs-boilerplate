import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import {
    DeviceCursorAvailableOrderBy,
    DeviceDefaultAvailableOrderBy,
} from '@modules/device/constants/device.list.constant';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type {
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
} from '@modules/device/interfaces/device.interface';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('DeviceHttpService', () => {
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const accessibleWhere = { userId: 'user-id' };
    const ownership = mock<IDeviceOwnership>({ _count: { sessions: 2 } });
    const ownershipWithSession = mock<IDeviceOwnershipWithSession>({
        _count: { sessions: 3 },
        sessions: [{ id: 'session-id' }],
    });
    const ownershipWithoutSession = mock<IDeviceOwnershipWithSession>({
        _count: { sessions: 0 },
        sessions: [],
    });
    const offsetParams = {
        where: undefined,
        limit: 20,
        skip: 0,
        orderBy: [],
    };
    const offsetStorePatch = {
        page: 1,
        perPage: 20,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
        filters: {},
    };
    const cursorParams = {
        where: undefined,
        limit: 20,
        cursor: undefined,
        cursorField: 'id',
        orderBy: [],
    };
    const cursorStorePatch = {
        perPage: 20,
        cursor: undefined,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
        filters: {},
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [ownership],
    };

    let service: DeviceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.accessibleWhere.mockReturnValue(accessibleWhere);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceHttpService,
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(DeviceHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('passes the revoke filter and the read predicate of DeviceOwnership to the domain and counts active sessions', async () => {
            const query = { isRevoked: true };
            const isRevokedWhere = { isRevoked: true };
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: isRevokedWhere,
                storeFilter: { isRevoked: true },
            } as never);
            deviceDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListOffsetByAdmin('user-id', query);

            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.DeviceOwnership
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: DeviceDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...offsetStorePatch, filters: { isRevoked: true } }
            );
            expect(deviceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-id',
                offsetParams,
                isRevokedWhere,
                accessibleWhere
            );
            expect(result.data).toEqual([
                {
                    ...ownership,
                    activeSessionCount: 2,
                    isCurrentDevice: false,
                },
            ]);
        });

        it('merges an empty filter set and passes undefined filters when no revoke filter is given', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            deviceDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            await service.getListOffsetByAdmin('user-id', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...offsetStorePatch, filters: {} }
            );
            expect(deviceDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-id',
                offsetParams,
                undefined,
                accessibleWhere
            );
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(deviceDomain.getListOffsetByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(RequestContextMissingException);
            expect(deviceDomain.getListOffsetByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getListCursor', () => {
        it('marks the device holding the current session and counts active sessions', async () => {
            const query = {};
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            deviceDomain.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                count: 2,
                perPage: 20,
                hasNext: false,
                cursor: undefined,
                data: [ownershipWithSession, ownershipWithoutSession],
            });

            const result = await service.getListCursor(
                'user-id',
                'session-id',
                query
            );

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: DeviceCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(deviceDomain.getListCursor).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                cursorParams
            );
            expect(policyAbilityDomain.accessibleWhere).not.toHaveBeenCalled();
            expect(result.data).toEqual([
                {
                    ...ownershipWithSession,
                    activeSessionCount: 3,
                    isCurrentDevice: true,
                },
                {
                    ...ownershipWithoutSession,
                    activeSessionCount: 0,
                    isCurrentDevice: false,
                },
            ]);
        });
    });

    describe('refresh', () => {
        it('delegates to the domain', async () => {
            const body = {
                name: 'Phone',
            } satisfies DeviceRefreshRequestDto;
            deviceDomain.refresh.mockResolvedValue(undefined);

            await expect(
                service.refresh('user-id', 'ownership-id', body)
            ).resolves.toBeUndefined();
            expect(deviceDomain.refresh).toHaveBeenCalledWith(
                'user-id',
                'ownership-id',
                body
            );
        });
    });

    describe('remove', () => {
        it('delegates to the domain', async () => {
            deviceDomain.remove.mockResolvedValue(undefined);

            await expect(
                service.remove('user-id', 'ownership-id')
            ).resolves.toBeUndefined();
            expect(deviceDomain.remove).toHaveBeenCalledWith(
                'user-id',
                'ownership-id'
            );
        });
    });

    describe('removeByAdmin', () => {
        it('checks delete on the active ownership of the route user, delegates to the domain and answers an empty envelope', async () => {
            deviceDomain.getOneActive.mockResolvedValue(ownership);
            deviceDomain.removeByAdmin.mockResolvedValue(undefined);

            await expect(
                service.removeByAdmin('user-id', 'ownership-id', 'admin-id')
            ).resolves.toEqual({});
            expect(deviceDomain.getOneActive).toHaveBeenCalledWith(
                'user-id',
                'ownership-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                ownership
            );
            expect(deviceDomain.removeByAdmin).toHaveBeenCalledWith(
                'user-id',
                'ownership-id',
                'admin-id'
            );
        });

        it('throws PolicyForbiddenException and never removes when the record is denied', async () => {
            deviceDomain.getOneActive.mockResolvedValue(ownership);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.removeByAdmin('user-id', 'ownership-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(deviceDomain.removeByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            deviceDomain.getOneActive.mockResolvedValue(ownership);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.removeByAdmin('user-id', 'ownership-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(deviceDomain.removeByAdmin).not.toHaveBeenCalled();
        });
    });
});
