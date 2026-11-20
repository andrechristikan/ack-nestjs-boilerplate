import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    ProjectCursorOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectGetListCursorByMemberUseCase } from '@modules/project/use-cases/project.get-list-cursor-by-member.use-case';
import {
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumProjectCursorOrderBy } from '@modules/project/enums/project.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('ProjectGetListCursorByMemberUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const paginationCursor: IPaginationQueryCursorParams = {
        fingerprint: '346bbbf166fc8f28',
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
        limit: 20,
    };

    let useCase: ProjectGetListCursorByMemberUseCase;

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

    const workspaceMember: WorkspaceMember = buildWorkspaceMember(
        '507f1f77bcf86cd799439014'
    );

    const workspaceContext = buildWorkspaceContext(
        { ...buildWorkspace(), id: '507f1f77bcf86cd799439012' },
        workspaceMember
    );

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGetListCursorByMemberUseCase,
                { provide: ProjectService, useValue: projectService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(ProjectGetListCursorByMemberUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: ProjectUserListRequestDto = { perPage: 20 };
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [project],
            };
            projectService.getListCursorByMember.mockResolvedValue(page);

            const result = await useCase.execute(workspaceContext, query);

            expect(result).toEqual(page);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: EnumProjectCursorOrderBy.latest,
                    availableSearch: ProjectDefaultAvailableSearch,
                    availableOrderBy: Object.keys(ProjectCursorOrderBy),
                }
            );
            expect(projectService.getListCursorByMember).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                paginationCursor
            );
        });
    });
});
