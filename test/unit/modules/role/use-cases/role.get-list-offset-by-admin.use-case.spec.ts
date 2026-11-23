import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma, EnumRoleScope } from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { RoleService } from '@modules/role/services/role.service';
import type { IRoleWithPolicyCount } from '@modules/role/interfaces/role.interface';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RoleGetListOffsetByAdminUseCase } from '@modules/role/use-cases/role.get-list-offset-by-admin.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('RoleGetListOffsetByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const where: IPolicyWhereInput<'Role'> = { scope: EnumRoleScope.platform };
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
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        policyRevision: 0,
        isImmutable: false,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const offsetPagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };
    const cursorPagination: IPaginationQueryCursorParams = {
        fingerprint: 'aaaaaaaaaaaaaaaa',
        limit: 20,
        orderBy: [],
    };

    let useCase: RoleGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(where);
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
                RoleGetListOffsetByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
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

        useCase = module.get(RoleGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the scope filter, and maps policy count rows', async () => {
            const query: RoleAdminListRequestDto = { scope: 'platform' };
            const scopeFilter = {
                where: { scope: { in: [EnumRoleScope.platform] } },
                storeFilter: { scope: [EnumRoleScope.platform] },
            };
            paginationFilterUtil.inEnum.mockReturnValue(scopeFilter);
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
            roleService.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            const result = await useCase.execute(policyContext, query);

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
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                Prisma.RoleScalarFieldEnum.scope,
                query.scope,
                RoleDefaultScope
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { scope: [EnumRoleScope.platform] } }
            );
            expect(roleService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                scopeFilter.where,
                where
            );
        });

        it('merges an empty filter set when scope is absent', async () => {
            const query: RoleAdminListRequestDto = {};
            paginationFilterUtil.inEnum.mockReturnValue(null);
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
            roleService.getListOffsetByAdmin.mockResolvedValue(emptyOffsetPage);

            await useCase.execute(policyContext, query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(roleService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                null,
                where
            );
        });
    });
});
