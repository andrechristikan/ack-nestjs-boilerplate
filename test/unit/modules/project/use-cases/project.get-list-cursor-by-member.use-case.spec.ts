import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
    ProjectUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectGetListCursorByMemberUseCase } from '@modules/project/use-cases/project.get-list-cursor-by-member.use-case';

describe('ProjectGetListCursorByMemberUseCase', () => {
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const paginationCursor: IPaginationQueryCursorParams<Prisma.ProjectWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            where: {},
            orderBy: [],
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

    const workspaceMember: WorkspaceMember = {
        id: '507f1f77bcf86cd799439013',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439014',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGetListCursorByMemberUseCase,
                { provide: ProjectService, useValue: projectService },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(ProjectGetListCursorByMemberUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: ProjectUserListRequestDto = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({
                params: paginationCursor,
                storePatch: { cursor: 'next' },
            });
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [project],
            };
            projectService.getListCursorByMember.mockResolvedValue(page);

            const result = await useCase.execute(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                query
            );

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: ProjectUserListCursorScope,
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { cursor: 'next' }
            );
            expect(projectService.getListCursorByMember).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                paginationCursor
            );
        });
    });
});
