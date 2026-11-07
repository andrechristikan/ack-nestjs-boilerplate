import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleSystemListCursorScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import { RoleService } from '@modules/role/services/role.service';
import type { IRoleWithPolicyCount } from '@modules/role/interfaces/role.interface';
import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RoleGetListCursorBySystemUseCase } from '@modules/role/use-cases/role.get-list-cursor-by-system.use-case';

describe('RoleGetListCursorBySystemUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        isImmutable: false,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
    const cursorPagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            limit: 20,
            orderBy: [],
        };

    let useCase: RoleGetListCursorBySystemUseCase;

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
                RoleGetListCursorBySystemUseCase,
                { provide: RoleService, useValue: roleService },
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

        useCase = module.get(RoleGetListCursorBySystemUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleSystemListRequestDto = { type: 'admin' };
            const typeFilter = {
                where: { type: { in: [EnumRoleType.admin] } },
                storeFilter: { type: [EnumRoleType.admin] },
            };
            paginationFilterUtil.inEnum.mockReturnValue(typeFilter);
            const cursorPage: IPaginationCursorReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [{ ...role, _count: { policies: 2 } }],
            };
            roleService.getListCursorBySystem.mockResolvedValue(cursorPage);

            const result = await useCase.execute(query);

            expect(result).toEqual({
                type: 'cursor',
                perPage: 20,
                hasNext: false,
                data: [{ ...role, policies: 2 }],
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: RoleSystemListCursorScope,
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
            expect(roleService.getListCursorBySystem).toHaveBeenCalledWith(
                cursorPagination,
                typeFilter.where
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleSystemListRequestDto = {};
            paginationFilterUtil.inEnum.mockReturnValue(null);
            const emptyCursorPage: IPaginationCursorReturn<IRoleWithPolicyCount> =
                {
                    type: EnumPaginationType.cursor,
                    perPage: 20,
                    hasNext: false,
                    data: [],
                };
            roleService.getListCursorBySystem.mockResolvedValue(
                emptyCursorPage
            );

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(roleService.getListCursorBySystem).toHaveBeenCalledWith(
                cursorPagination,
                undefined
            );
        });
    });
});
