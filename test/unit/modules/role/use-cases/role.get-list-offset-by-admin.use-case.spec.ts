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
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { RoleService } from '@modules/role/services/role.service';
import type { IRoleWithPolicyCount } from '@modules/role/interfaces/role.interface';
import type { IPaginationOffsetReturn } from '@common/pagination/interfaces/pagination.interface';
import { RoleGetListOffsetByAdminUseCase } from '@modules/role/use-cases/role.get-list-offset-by-admin.use-case';

describe('RoleGetListOffsetByAdminUseCase', () => {
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
    const offsetPagination = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };

    let useCase: RoleGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGetListOffsetByAdminUseCase,
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

        useCase = module.get(RoleGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleAdminListRequestDto = { type: 'admin' };
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

            const result = await useCase.execute(query);

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
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    availableSearch: ['name'],
                    availableOrderBy: ['latest', 'name'],
                    orderBy: 'latest',
                    perPage: 20,
                    page: 1,
                    filters: { type: [EnumRoleType.admin] },
                }
            );
            expect(roleService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                { type: { in: [EnumRoleType.admin] } }
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleAdminListRequestDto = {};
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

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    availableSearch: ['name'],
                    availableOrderBy: ['latest', 'name'],
                    orderBy: 'latest',
                    perPage: 20,
                    page: 1,
                    filters: {},
                }
            );
            expect(roleService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });
});
