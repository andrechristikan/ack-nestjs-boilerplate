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
import { EnumRoleType } from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import { RoleService } from '@modules/role/services/role.service';
import type { IRoleWithPolicyCount } from '@modules/role/interfaces/role.interface';
import type { IPaginationCursorReturn } from '@common/pagination/interfaces/pagination.interface';
import { RoleGetListCursorBySystemUseCase } from '@modules/role/use-cases/role.get-list-cursor-by-system.use-case';

describe('RoleGetListCursorBySystemUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
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
    const cursorPagination = {
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };

    let useCase: RoleGetListCursorBySystemUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGetListCursorBySystemUseCase,
                { provide: RoleService, useValue: roleService },
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

        useCase = module.get(RoleGetListCursorBySystemUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleSystemListRequestDto = { type: 'admin' };
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
            expect(roleService.getListCursorBySystem).toHaveBeenCalledWith(
                { ...cursorPagination, fingerprint: 'd90e1829ed81c98e' },
                { type: { in: [EnumRoleType.admin] } }
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleSystemListRequestDto = {};
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
                {
                    availableSearch: ['name'],
                    availableOrderBy: ['latest', 'name'],
                    orderBy: 'latest',
                    perPage: 20,
                    filters: {},
                }
            );
            expect(roleService.getListCursorBySystem).toHaveBeenCalledWith(
                { ...cursorPagination, fingerprint: 'db6f76f6d1a4dedf' },
                undefined
            );
        });
    });
});
