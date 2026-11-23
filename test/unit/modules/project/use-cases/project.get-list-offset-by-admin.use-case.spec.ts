import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectGetListOffsetByAdminUseCase } from '@modules/project/use-cases/project.get-list-offset-by-admin.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('ProjectGetListOffsetByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'Project'> = { id: 'scoped-1' };
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const paginationOffset: IPaginationQueryOffsetParams = {
        where: { OR: [] },
        orderBy: [],
        limit: 20,
        skip: 0,
    };

    const workspaceFilter = {
        where: { workspaceId: { equals: '507f1f77bcf86cd799439012' } },
        storeFilter: { workspaceId: '507f1f77bcf86cd799439012' },
    };

    let useCase: ProjectGetListOffsetByAdminUseCase;

    const project: Project = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        name: 'Website Revamp',
        slug: 'p-abc123',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                ProjectGetListOffsetByAdminUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(ProjectGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('builds the workspaceId filter through the filter util and merges its store filter when present', async () => {
            const query: ProjectAdminListRequestDto = {
                page: 1,
                perPage: 20,
                workspaceId: '507f1f77bcf86cd799439012',
            };
            paginationQueryUtil.offset.mockReturnValue({
                params: paginationOffset,
                storePatch: { page: 1, filters: { existing: true } },
            });
            paginationFilterUtil.equalString.mockReturnValue(workspaceFilter);
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [project],
            };
            projectService.getListOffsetByAdmin.mockResolvedValue(page);

            const result = await useCase.execute(policyContext, query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectDefaultAvailableOrderBy,
            });
            expect(paginationFilterUtil.equalString).toHaveBeenCalledWith(
                Prisma.ProjectScalarFieldEnum.workspaceId,
                '507f1f77bcf86cd799439012'
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    filters: {
                        existing: true,
                        workspaceId: '507f1f77bcf86cd799439012',
                    },
                }
            );
            expect(projectService.getListOffsetByAdmin).toHaveBeenCalledWith(
                paginationOffset,
                workspaceFilter.where,
                scoped
            );
        });

        it('omits workspaceId from the store filters and the domain call when absent', async () => {
            const query: ProjectAdminListRequestDto = {
                page: 1,
                perPage: 20,
            };
            paginationQueryUtil.offset.mockReturnValue({
                params: paginationOffset,
                storePatch: { page: 1 },
            });
            paginationFilterUtil.equalString.mockReturnValue(null);
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            };
            projectService.getListOffsetByAdmin.mockResolvedValue(page);

            await useCase.execute(policyContext, query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { page: 1, filters: {} }
            );
            expect(projectService.getListOffsetByAdmin).toHaveBeenCalledWith(
                paginationOffset,
                null,
                scoped
            );
        });
    });
});
