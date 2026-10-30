import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectDomain', () => {
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let domain: ProjectDomain;

    const baseProject: Project = {
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

    const baseWorkspaceMember: WorkspaceMember = {
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
                ProjectDomain,
                { provide: ProjectRepository, useValue: projectRepository },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(ProjectDomain);
    });

    describe('validateProjectGuard', () => {
        it('throws RequestContextMissingException when projectId is null', async () => {
            let thrown: unknown;
            try {
                await domain.validateProjectGuard(
                    '507f1f77bcf86cd799439012',
                    null
                );
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, 'params.projectId');
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
        });

        it('throws ProjectNotFoundException when the repository finds no active project', async () => {
            projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(
                null
            );

            const rejection = domain.validateProjectGuard(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439011'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.notFound
                    ],
                messagePath: 'project.error.notFound',
            });
        });

        it('returns the active project resolved by workspace and id', async () => {
            const project = baseProject;
            projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(
                project
            );

            const result = await domain.validateProjectGuard(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(project);
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012'
            );
        });
    });

    describe('getActiveByIdAndWorkspace', () => {
        it('delegates to the repository', async () => {
            const project = baseProject;
            projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(
                project
            );

            const result = await domain.getActiveByIdAndWorkspace(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012'
            );

            expect(result).toBe(project);
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012'
            );
        });
    });

    describe('getListCursorByMember', () => {
        const pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput> =
            { where: {}, orderBy: [], limit: 20 };

        it('passes a null memberUserId when the caller is the workspace owner', async () => {
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseProject],
            };
            projectUtil.hasWorkspaceBypass.mockReturnValue(true);
            projectRepository.findWithPaginationCursorForWorkspace.mockResolvedValue(
                page
            );
            const workspaceMember = {
                ...baseWorkspaceMember,
                role: EnumWorkspaceMemberRole.owner,
            };

            const result = await domain.getListCursorByMember(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                pagination
            );

            expect(result).toBe(page);
            expect(
                projectRepository.findWithPaginationCursorForWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                null,
                pagination
            );
        });

        it('passes the caller userId when the caller is not the workspace owner', async () => {
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            projectUtil.hasWorkspaceBypass.mockReturnValue(false);
            projectRepository.findWithPaginationCursorForWorkspace.mockResolvedValue(
                page
            );
            const workspaceMember = {
                ...baseWorkspaceMember,
                role: EnumWorkspaceMemberRole.member,
            };

            await domain.getListCursorByMember(
                '507f1f77bcf86cd799439012',
                workspaceMember,
                pagination
            );

            expect(
                projectRepository.findWithPaginationCursorForWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                workspaceMember.userId,
                pagination
            );
        });
    });

    describe('createProject', () => {
        it('draws slug candidates from the util and creates the project with them', async () => {
            const project = baseProject;
            const slugCandidates = ['p-abc123', 'p-def456'];
            projectUtil.drawSlugCandidates.mockReturnValue(slugCandidates);
            projectRepository.create.mockResolvedValue(project);
            const create: IProjectCreate = {
                name: 'Website Revamp',
                description: null,
            };

            const result = await domain.createProject(
                '507f1f77bcf86cd799439012',
                create
            );

            expect(result).toBe(project);
            expect(projectRepository.create).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                create,
                slugCandidates
            );
        });
    });

    describe('updateProject', () => {
        it('updates the details and returns the row', async () => {
            const project = baseProject;
            const updated = { ...baseProject, name: 'New Name' };
            projectRepository.updateDetails.mockResolvedValue(updated);
            const update: IProjectUpdate = {
                name: 'New Name',
                description: null,
            };

            const result = await domain.updateProject(project, update);

            expect(result).toBe(updated);
            expect(projectRepository.updateDetails).toHaveBeenCalledWith(
                project.id,
                update
            );
        });
    });

    describe('updateProjectSlug', () => {
        it('throws ProjectSlugInvalidException when the util refuses the slug', async () => {
            const project = baseProject;
            projectUtil.isSlugAllowed.mockReturnValue(false);

            await expect(
                domain.updateProjectSlug(project, 'invalid slug!')
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugInvalid
                    ],
                messagePath: 'project.error.slugInvalid',
            });
            expect(projectUtil.isSlugAllowed).toHaveBeenCalledWith(
                'invalid slug!'
            );
            expect(
                projectRepository.existsBySlugInWorkspace
            ).not.toHaveBeenCalled();
        });

        it('throws ProjectSlugAlreadyExistsException when the slug is taken in the workspace', async () => {
            const project = baseProject;
            projectUtil.isSlugAllowed.mockReturnValue(true);
            projectRepository.existsBySlugInWorkspace.mockResolvedValue(true);

            await expect(
                domain.updateProjectSlug(project, 'p-taken')
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugAlreadyExists
                    ],
                messagePath: 'project.error.slugAlreadyExists',
            });
            expect(
                projectRepository.existsBySlugInWorkspace
            ).toHaveBeenCalledWith(project.workspaceId, 'p-taken', project.id);
        });

        it('updates the slug when it is allowed and free', async () => {
            const project = baseProject;
            const updated = { ...baseProject, slug: 'p-new-slug' };
            projectUtil.isSlugAllowed.mockReturnValue(true);
            projectRepository.existsBySlugInWorkspace.mockResolvedValue(false);
            projectRepository.updateSlug.mockResolvedValue(updated);

            const result = await domain.updateProjectSlug(
                project,
                'p-new-slug'
            );

            expect(result).toBe(updated);
            expect(projectRepository.updateSlug).toHaveBeenCalledWith(
                project.id,
                'p-new-slug'
            );
        });
    });

    describe('softDeleteProject', () => {
        it('soft-deletes the project at the current date', async () => {
            const project = baseProject;
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(deletedAt);

            await domain.softDeleteProject(project);

            expect(projectRepository.softDelete).toHaveBeenCalledWith(
                project.id,
                deletedAt
            );
        });
    });

    describe('softDeleteByWorkspaceInTx', () => {
        it('delegates to the repository with the given transaction', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');

            await domain.softDeleteByWorkspaceInTx(
                tx,
                '507f1f77bcf86cd799439012',
                deletedAt,
                '507f1f77bcf86cd799439015'
            );

            expect(
                projectRepository.softDeleteByWorkspaceInTx
            ).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439012',
                deletedAt,
                '507f1f77bcf86cd799439015'
            );
        });
    });

    describe('getListOffsetByAdmin', () => {
        const pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput> =
            { where: {}, orderBy: [], limit: 20, skip: 0 };

        it('delegates to the repository with an optional workspaceId', async () => {
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [baseProject],
            };
            projectRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(
                pagination,
                '507f1f77bcf86cd799439012'
            );

            expect(result).toBe(page);
            expect(
                projectRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, '507f1f77bcf86cd799439012');
        });
    });

    describe('getByIdByAdmin', () => {
        it('throws ProjectNotFoundException when the repository finds nothing', async () => {
            projectRepository.findByIdByAdmin.mockResolvedValue(null);

            const rejection = domain.getByIdByAdmin('507f1f77bcf86cd799439011');

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.notFound
                    ],
                messagePath: 'project.error.notFound',
            });
        });

        it('returns the project resolved by id', async () => {
            const project = baseProject;
            projectRepository.findByIdByAdmin.mockResolvedValue(project);

            const result = await domain.getByIdByAdmin(
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(project);
        });
    });
});
