import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRoleScope } from '@generated/prisma-client/client';
import {
    RoleCursorAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleSharedListCursorScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleSharedListRequestDto } from '@modules/role/dtos/request/role.shared-list.request.dto';
import type { IRoleWithPolicyCount } from '@modules/role/interfaces/role.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleGetListCursorBySharedUseCase } from '@modules/role/use-cases/role.get-list-cursor-by-shared.use-case';

describe('RoleGetListCursorBySharedUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const params: IPaginationQueryCursorParams = {
        fingerprint: 'aaaaaaaaaaaaaaaa',
        limit: 20,
        orderBy: [],
    };
    const now = new Date('2026-01-01T00:00:00.000Z');
    const row: IRoleWithPolicyCount = {
        id: 'role-1',
        scope: EnumRoleScope.workspace,
        key: 'owner',
        name: 'Owner',
        description: null,
        policyRevision: 0,
        isImmutable: true,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        _count: { policies: 4 },
    };
    const page: IPaginationCursorReturn<IRoleWithPolicyCount> = {
        type: EnumPaginationType.cursor,
        perPage: 20,
        hasNext: false,
        data: [row],
    };

    let useCase: RoleGetListCursorBySharedUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.cursor.mockReturnValue({
            params,
            storePatch: { filters: {} },
        });
        roleService.getListCursorByShared.mockResolvedValue(page);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGetListCursorBySharedUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(RoleGetListCursorBySharedUseCase);
    });

    describe('execute', () => {
        it('lists the catalog of the requested scope and maps the policy count', async () => {
            const query: RoleSharedListRequestDto = {
                scope: EnumRoleScope.workspace,
            };

            const result = await useCase.execute(query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: RoleSharedListCursorScope,
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleCursorAvailableOrderBy,
            });
            expect(roleService.getListCursorByShared).toHaveBeenCalledWith(
                params,
                EnumRoleScope.workspace
            );
            expect(result).toMatchObject({
                data: [{ id: 'role-1', key: 'owner', policies: 4 }],
            });
        });

        it('records the scope filter for the response envelope', async () => {
            await useCase.execute({ scope: EnumRoleScope.project });

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { scope: [EnumRoleScope.project] } }
            );
        });
    });
});
