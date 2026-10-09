import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import {
    RoleDefaultAvailableSearch,
    RoleDefaultType,
} from '@modules/role/constants/role.list.constant';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type {
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleHttpService } from '@modules/role/services/role.http.service';
import type {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';

describe('RoleHttpService', () => {
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const roleWithPolicies: IRoleWithPolicies = { ...role, policies: [] };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
    const cursorPagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput> =
        { limit: 20, orderBy: [] };

    let service: RoleHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: offsetPagination,
            storePatch: {},
        });
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleHttpService,
                { provide: RoleDomain, useValue: roleDomain },
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

        service = module.get(RoleHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('parses the offset query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleAdminListRequestDto = { type: 'admin' };
            const typeFilter = {
                where: { type: { in: [EnumRoleType.admin] } },
                storeFilter: { type: [EnumRoleType.admin] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(typeFilter);
            const offsetPage: IPaginationOffsetReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ ...role, _count: { policies: 3 } }],
            };
            roleDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListOffsetByAdmin(query);

            expect(result).toEqual({
                type: 'offset',
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ ...role, policies: 3 }],
            });
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: RoleDefaultAvailableSearch,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.RoleScalarFieldEnum.type,
                query.type,
                RoleDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { type: [EnumRoleType.admin] } }
            );
            expect(roleDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                typeFilter.where
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleAdminListRequestDto = {};
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const emptyOffsetPage: IPaginationOffsetReturn<IRoleWithPolicyCount> =
                {
                    type: EnumPaginationType.offset,
                    count: 0,
                    perPage: 20,
                    page: 1,
                    totalPage: 0,
                    hasNext: false,
                    hasPrevious: false,
                    data: [],
                };
            roleDomain.getListOffsetByAdmin.mockResolvedValue(emptyOffsetPage);

            await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(roleDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });

    describe('getListCursorBySystem', () => {
        it('parses the cursor query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleSystemListRequestDto = { type: 'admin' };
            const typeFilter = {
                where: { type: { in: [EnumRoleType.admin] } },
                storeFilter: { type: [EnumRoleType.admin] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(typeFilter);
            const cursorPage: IPaginationCursorReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [{ ...role, _count: { policies: 2 } }],
            };
            roleDomain.getListCursorBySystem.mockResolvedValue(cursorPage);

            const result = await service.getListCursorBySystem(query);

            expect(result).toEqual({
                type: 'cursor',
                perPage: 20,
                hasNext: false,
                data: [{ ...role, policies: 2 }],
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: RoleDefaultAvailableSearch,
            });
            expect(roleDomain.getListCursorBySystem).toHaveBeenCalledWith(
                cursorPagination,
                typeFilter.where
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleSystemListRequestDto = {};
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const emptyCursorPage: IPaginationCursorReturn<IRoleWithPolicyCount> =
                {
                    type: EnumPaginationType.cursor,
                    perPage: 20,
                    hasNext: false,
                    data: [],
                };
            roleDomain.getListCursorBySystem.mockResolvedValue(emptyCursorPage);

            await service.getListCursorBySystem(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(roleDomain.getListCursorBySystem).toHaveBeenCalledWith(
                cursorPagination,
                undefined
            );
        });
    });

    describe('getOne', () => {
        it('wraps the domain role in the response envelope', async () => {
            roleDomain.getOne.mockResolvedValue(roleWithPolicies);

            const result = await service.getOne(roleWithPolicies.id);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleDomain.getOne).toHaveBeenCalledWith(roleWithPolicies.id);
        });
    });

    describe('createByAdmin', () => {
        it('creates the role and wraps the result', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            roleDomain.createByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await service.createByAdmin(body);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleDomain.createByAdmin).toHaveBeenCalledWith({
                name: 'manager',
                description: null,
                type: EnumRoleType.admin,
            });
        });
    });

    describe('updateByAdmin', () => {
        it('updates the role and wraps the result', async () => {
            const body: RoleUpdateRequestDto = { type: EnumRoleType.user };
            roleDomain.updateByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdmin(
                roleWithPolicies.id,
                body
            );

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleDomain.updateByAdmin).toHaveBeenCalledWith(
                roleWithPolicies.id,
                { description: null, type: EnumRoleType.user }
            );
        });
    });

    describe('deleteByAdmin', () => {
        it('deletes the role and returns an empty response', async () => {
            roleDomain.deleteByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await service.deleteByAdmin(roleWithPolicies.id);

            expect(result).toEqual({});
            expect(roleDomain.deleteByAdmin).toHaveBeenCalledWith(
                roleWithPolicies.id
            );
        });
    });
});
