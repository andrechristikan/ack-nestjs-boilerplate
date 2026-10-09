import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import {
    expectRequestContextMissingWithKey,
    expectRequestGuardMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectDomain', () => {
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const projectUtil: MockProxy<ProjectUtil> = mock<ProjectUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet =
        vi.fn<(key: string) => string | number | RegExp | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
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

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.projectCreated,
        metadata: {},
        onError: false,
        userId: '507f1f77bcf86cd799439015',
        createdBy: '507f1f77bcf86cd799439015',
        workspaceId: '507f1f77bcf86cd799439012',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number | RegExp> = {
                'project.slugRegex': /^[0-9a-zA-Z-]+$/,
                'project.slugPrefix': 'p-',
                'project.slugMaxLength': 30,
                'project.slugMaxAttempts': 5,
            };
            return values[key];
        });
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectDomain,
                { provide: ProjectRepository, useValue: projectRepository },
                { provide: ProjectUtil, useValue: projectUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(ProjectDomain);
    });

    describe('validateProjectGuard', () => {
        it('throws RequestGuardMissingException when workspaceId is null', async () => {
            let thrown: unknown;
            try {
                await domain.validateProjectGuard(
                    null,
                    '507f1f77bcf86cd799439011'
                );
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, WorkspaceStoreKey);
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
        });

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
            projectUtil.isWorkspaceOwner.mockReturnValue(true);
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
            projectUtil.isWorkspaceOwner.mockReturnValue(false);
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
        it('prepares the created activity log, draws slug candidates, creates, and stages the activity log', async () => {
            const project = baseProject;
            helperStringService.generateSlug.mockReturnValue('p-abc123');
            projectRepository.create.mockResolvedValue(project);
            const create: IProjectCreate = {
                name: 'Website Revamp',
                description: null,
            };

            const result = await domain.createProject(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439015',
                create
            );

            expect(result).toBe(project);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectCreated,
                userId: '507f1f77bcf86cd799439015',
                createdBy: '507f1f77bcf86cd799439015',
                workspaceId: '507f1f77bcf86cd799439012',
            });
            expect(helperStringService.generateSlug).toHaveBeenCalledTimes(5);
            expect(helperStringService.generateSlug).toHaveBeenCalledWith(
                'p-',
                30
            );
            expect(projectRepository.create).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                create,
                ['p-abc123', 'p-abc123', 'p-abc123', 'p-abc123', 'p-abc123']
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('getProject', () => {
        it('returns the given project unchanged', () => {
            const project = baseProject;

            expect(domain.getProject(project)).toBe(project);
        });
    });

    describe('updateProject', () => {
        it('prepares the updated activity log, updates the details, and stages the activity log', async () => {
            const project = baseProject;
            const updated = { ...baseProject, name: 'New Name' };
            projectRepository.updateDetails.mockResolvedValue(updated);
            const update: IProjectUpdate = {
                name: 'New Name',
                description: null,
            };

            const result = await domain.updateProject(
                project,
                '507f1f77bcf86cd799439015',
                update
            );

            expect(result).toBe(updated);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectUpdated,
                userId: '507f1f77bcf86cd799439015',
                createdBy: '507f1f77bcf86cd799439015',
                workspaceId: project.workspaceId,
            });
            expect(projectRepository.updateDetails).toHaveBeenCalledWith(
                project.id,
                update
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('updateProjectSlug', () => {
        it('throws ProjectSlugInvalidException when the slug exceeds the max length', async () => {
            const project = baseProject;

            await expect(
                domain.updateProjectSlug(
                    project,
                    '507f1f77bcf86cd799439015',
                    'p-'.padEnd(31, 'a')
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugInvalid
                    ],
                messagePath: 'project.error.slugInvalid',
            });
        });

        it('throws ProjectSlugInvalidException when the slug fails the allowed pattern', async () => {
            const project = baseProject;

            const rejection = domain.updateProjectSlug(
                project,
                '507f1f77bcf86cd799439015',
                'invalid slug!'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugInvalid
                    ],
                messagePath: 'project.error.slugInvalid',
            });
        });

        it('throws ProjectSlugAlreadyExistsException when the slug is taken in the workspace', async () => {
            const project = baseProject;
            projectRepository.existsBySlugInWorkspace.mockResolvedValue(true);

            await expect(
                domain.updateProjectSlug(
                    project,
                    '507f1f77bcf86cd799439015',
                    'p-taken'
                )
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

        it('updates the slug, prepares the activity log, and stages it when the slug is free', async () => {
            const project = baseProject;
            const updated = { ...baseProject, slug: 'p-new-slug' };
            projectRepository.existsBySlugInWorkspace.mockResolvedValue(false);
            projectRepository.updateSlug.mockResolvedValue(updated);

            const result = await domain.updateProjectSlug(
                project,
                '507f1f77bcf86cd799439015',
                'p-new-slug'
            );

            expect(result).toBe(updated);
            expect(projectRepository.updateSlug).toHaveBeenCalledWith(
                project.id,
                'p-new-slug'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectUpdated,
                userId: '507f1f77bcf86cd799439015',
                createdBy: '507f1f77bcf86cd799439015',
                workspaceId: project.workspaceId,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('softDeleteProject', () => {
        it('prepares the deleted activity log, soft-deletes at the current date, and stages the activity log', async () => {
            const project = baseProject;
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(deletedAt);

            await domain.softDeleteProject(project, '507f1f77bcf86cd799439015');

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectDeleted,
                userId: '507f1f77bcf86cd799439015',
                createdBy: '507f1f77bcf86cd799439015',
                workspaceId: project.workspaceId,
            });
            expect(projectRepository.softDelete).toHaveBeenCalledWith(
                project.id,
                deletedAt
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
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

    describe('drawSlugCandidates', () => {
        it('draws slugMaxAttempts slug candidates from the prefix and max length', () => {
            helperStringService.generateSlug.mockReturnValue('p-generated');

            const result = domain['drawSlugCandidates']();

            expect(result).toEqual(new Array(5).fill('p-generated'));
            expect(helperStringService.generateSlug).toHaveBeenCalledTimes(5);
            expect(helperStringService.generateSlug).toHaveBeenCalledWith(
                'p-',
                30
            );
        });
    });

    describe('assertSlugAllowed', () => {
        it('does not throw for a slug within length and matching the pattern', () => {
            expect(() =>
                domain['assertSlugAllowed']('p-valid-slug')
            ).not.toThrow();
        });

        it('throws ProjectSlugInvalidException for a slug over the max length', () => {
            let thrown: unknown;
            try {
                domain['assertSlugAllowed']('p-'.padEnd(31, 'a'));
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugInvalid
                    ],
                messagePath: 'project.error.slugInvalid',
            });
        });

        it('throws ProjectSlugInvalidException for a slug failing the pattern', () => {
            let thrown: unknown;
            try {
                domain['assertSlugAllowed']('invalid slug!');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugInvalid
                    ],
                messagePath: 'project.error.slugInvalid',
            });
        });
    });
});
