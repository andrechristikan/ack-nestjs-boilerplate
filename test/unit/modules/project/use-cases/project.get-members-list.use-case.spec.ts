import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import {
    ProjectMemberDefaultAvailableOrderBy,
    ProjectMemberUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import { ProjectGetMembersListUseCase } from '@modules/project/use-cases/project.get-members-list.use-case';

describe('ProjectGetMembersListUseCase', () => {
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();

    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();

    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput> =
        {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            where: {},
            orderBy: [],
            limit: 20,
        };

    let useCase: ProjectGetMembersListUseCase;

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

    const projectMemberRow: IProjectMember = {
        id: '507f1f77bcf86cd799439021',
        projectId: project.id,
        userId: '507f1f77bcf86cd799439022',
        role: EnumProjectMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: '507f1f77bcf86cd799439022',
            name: 'Jane Smith',
            username: 'meadowlark',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGetMembersListUseCase,
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(ProjectGetMembersListUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: ProjectMemberListRequestDto = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({
                params: pagination,
                storePatch: { cursor: 'next' },
            });
            const page: IResponsePaginationReturn<IProjectMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [projectMemberRow],
            };
            projectMemberService.getMembersList.mockResolvedValue(page);

            const result = await useCase.execute(project, query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: ProjectMemberUserListCursorScope,
                availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { cursor: 'next' }
            );
            expect(projectMemberService.getMembersList).toHaveBeenCalledWith(
                project,
                pagination
            );
        });
    });
});
