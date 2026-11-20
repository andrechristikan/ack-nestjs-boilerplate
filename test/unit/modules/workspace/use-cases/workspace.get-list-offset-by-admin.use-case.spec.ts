import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceGetListOffsetByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-list-offset-by-admin.use-case';
import { EnumWorkspaceOrderBy } from '@modules/workspace/enums/workspace.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildWorkspace } from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceGetListOffsetByAdminUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const workspace: Workspace = buildWorkspace();
    const offsetPagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    let useCase: WorkspaceGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetListOffsetByAdminUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the isPublic filter, and returns the page', async () => {
            const query: WorkspaceAdminListRequestDto = { isPublic: true };
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [workspace],
            };
            workspaceService.getListOffsetByAdmin.mockResolvedValue(page);

            const result = await useCase.execute(query);

            expect(result).toEqual(page);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    perPage: 20,
                    orderBy: EnumWorkspaceOrderBy.latest,
                    availableSearch: WorkspaceDefaultAvailableSearch,
                    availableOrderBy: Object.keys(WorkspaceOrderBy),
                    filters: { isPublic: true },
                }
            );
            expect(workspaceService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                { isPublic: { equals: true } }
            );
        });

        it('merges an empty filter set when isPublic is absent', async () => {
            const query: WorkspaceAdminListRequestDto = {};
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceService.getListOffsetByAdmin.mockResolvedValue(page);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    perPage: 20,
                    orderBy: EnumWorkspaceOrderBy.latest,
                    availableSearch: WorkspaceDefaultAvailableSearch,
                    availableOrderBy: Object.keys(WorkspaceOrderBy),
                    filters: {},
                }
            );
            expect(workspaceService.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });
});
