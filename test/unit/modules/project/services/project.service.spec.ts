import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
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
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import {
    buildUser,
    expectRequestContextMissingWithKey,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';

describe('ProjectService', () => {
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = buildActivityLogCreateManyEffect('entry');
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    let service: ProjectService;

    const configValues: Record<string, unknown> = {
        'project.slugRegex': /^[0-9a-z-]+$/,
        'project.slugPrefix': 'p-',
        'project.slugMaxLength': 30,
        'project.slugMaxAttempts': 5,
    };

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

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);
        activityLogService.recordEffect.mockReturnValue(entry);
        outboxService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectService,
                { provide: ProjectRepository, useValue: projectRepository },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = module.get(ProjectService);
    });

    describe('validateProjectGuard', () => {
        it('throws RequestContextMissingException when projectId is null', async () => {
            let thrown: unknown;
            try {
                await service.validateProjectGuard(
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

            const rejection = service.validateProjectGuard(
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

            const result = await service.validateProjectGuard(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(project);
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012',
                null
            );
        });
    });

    describe('getScopedByIdAndWorkspace', () => {
        it('throws ProjectNotFoundException when the scope reaches no project', async () => {
            projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(
                null
            );

            const rejection = service.getScopedByIdAndWorkspace(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012',
                { id: 'x' }
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
            });
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012',
                { id: 'x' }
            );
        });

        it('returns the scoped project', async () => {
            projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(
                baseProject
            );

            const result = await service.getScopedByIdAndWorkspace(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012',
                null
            );

            expect(result).toBe(baseProject);
        });
    });

    describe('getActiveByIdAndWorkspace', () => {
        it('delegates to the repository', async () => {
            const project = baseProject;
            projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(
                project
            );

            const result = await service.getActiveByIdAndWorkspace(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012'
            );

            expect(result).toBe(project);
            expect(
                projectRepository.findActiveByIdAndWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012',
                null
            );
        });
    });

    describe('getListCursorByMember', () => {
        it('lists the projects of the workspace inside the caller predicate', async () => {
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                where: { OR: [] },
                orderBy: [],
                limit: 20,
            };
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseProject],
            };
            const additionalWhere = { workspaceId: '507f1f77bcf86cd799439012' };
            projectRepository.findWithPaginationCursorForWorkspace.mockResolvedValue(
                page
            );

            const result = await service.getListCursorByMember(
                '507f1f77bcf86cd799439012',
                pagination,
                additionalWhere
            );

            expect(result).toBe(page);
            expect(
                projectRepository.findWithPaginationCursorForWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                pagination,
                additionalWhere
            );
        });
    });

    describe('createProject', () => {
        const create: IProjectCreate = {
            name: 'Website Revamp',
            description: null,
        };

        beforeEach(() => {
            helperStringService.generateSlugCandidates.mockReturnValue([
                'p-abc123',
                'p-def456',
            ]);
        });

        it('creates the project on the first slug candidate and adds the creator entry on the same tx', async () => {
            projectRepository.createInTx.mockResolvedValue(baseProject);

            const result = await service.createProject(
                requestContext,
                apiKeyContext,
                authContext,
                '507f1f77bcf86cd799439012',
                create
            );

            expect(result).toBe(baseProject);
            expect(projectRepository.createInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439012',
                create,
                'p-abc123'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectCreated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: '507f1f77bcf86cd799439012',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('retries with the next slug candidate after a slug collision', async () => {
            const collision = new Error('slug collision');
            outboxService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(fn => fn(tx));
            databaseUtil.isUniqueCollision.mockReturnValue(true);
            projectRepository.createInTx.mockResolvedValue(baseProject);

            const result = await service.createProject(
                requestContext,
                apiKeyContext,
                authContext,
                '507f1f77bcf86cd799439012',
                create
            );

            expect(result).toBe(baseProject);
            expect(projectRepository.createInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439012',
                create,
                'p-def456'
            );
        });

        it('wraps a non-collision failure in AppUnknownException without retrying', async () => {
            const otherError = new Error('unexpected');
            outboxService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createProject(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    '507f1f77bcf86cd799439012',
                    create
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('rethrows an AppBaseException without retrying', async () => {
            const typed = new DatabaseUniqueValueGenerationFailedException();
            outboxService.withTransaction.mockRejectedValue(typed);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createProject(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    '507f1f77bcf86cd799439012',
                    create
                )
            ).rejects.toBeInstanceOf(AppBaseException);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            outboxService.withTransaction.mockRejectedValue(
                new Error('slug collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.createProject(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    '507f1f77bcf86cd799439012',
                    create
                )
            ).rejects.toMatchObject({
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,

                constructor: DatabaseUniqueValueGenerationFailedException,
                module: 'database',
            });
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateProject', () => {
        it('updates the details and adds the entry on the same tx', async () => {
            const project = baseProject;
            const updated = { ...baseProject, name: 'New Name' };
            projectRepository.updateDetailsInTx.mockResolvedValue(updated);
            const update: IProjectUpdate = {
                name: 'New Name',
                description: null,
            };

            const result = await service.updateProject(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                update
            );

            expect(result).toBe(updated);
            expect(projectRepository.updateDetailsInTx).toHaveBeenCalledWith(
                tx,
                project.id,
                update
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectUpdated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: project.workspaceId,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });
    });

    describe('updateProjectSlug', () => {
        it('throws ProjectSlugInvalidException when the slug has an upper-case letter', async () => {
            await expect(
                service.updateProjectSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    'Acme'
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
            });
            expect(projectRepository.updateSlugInTx).not.toHaveBeenCalled();
        });

        it('throws ProjectSlugInvalidException when the slug is not allowed', async () => {
            const project = baseProject;

            await expect(
                service.updateProjectSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    'invalid slug!'
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
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws ProjectSlugAlreadyExistsException when the write collides on the slug index', async () => {
            const project = baseProject;
            const collision = new Error('slug collision');
            projectRepository.updateSlugInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.updateProjectSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
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
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
        });

        it('rethrows an AppBaseException thrown inside the transaction as is', async () => {
            const project = baseProject;
            const thrown = new ProjectNotFoundException();
            projectRepository.updateSlugInTx.mockRejectedValue(thrown);

            await expect(
                service.updateProjectSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    'p-new-slug'
                )
            ).rejects.toBe(thrown);
            expect(databaseUtil.isUniqueCollision).not.toHaveBeenCalled();
        });

        it('wraps a non-collision write error in AppUnknownException', async () => {
            const project = baseProject;
            const otherError = new Error('unexpected');
            projectRepository.updateSlugInTx.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.updateProjectSlug(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    'p-new-slug'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('updates the slug when it is allowed and adds the entry on the same tx', async () => {
            const project = baseProject;
            const updated = { ...baseProject, slug: 'p-new-slug' };
            projectRepository.updateSlugInTx.mockResolvedValue(updated);

            const result = await service.updateProjectSlug(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                'p-new-slug'
            );

            expect(result).toBe(updated);
            expect(projectRepository.updateSlugInTx).toHaveBeenCalledWith(
                tx,
                project.id,
                'p-new-slug'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectUpdated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: project.workspaceId,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });
    });

    describe('softDeleteProjectInTx', () => {
        it('soft-deletes the project on the given transaction', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');
            projectRepository.softDeleteInTx.mockResolvedValue(true);

            await service.softDeleteProjectInTx(
                tx,
                baseProject,
                deletedAt,
                '507f1f77bcf86cd799439015'
            );

            expect(projectRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                baseProject.id,
                deletedAt,
                '507f1f77bcf86cd799439015'
            );
        });

        it('throws ProjectNotFoundException when the guarded write misses', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');
            projectRepository.softDeleteInTx.mockResolvedValue(false);

            await expect(
                service.softDeleteProjectInTx(
                    tx,
                    baseProject,
                    deletedAt,
                    '507f1f77bcf86cd799439015'
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.notFound
                    ],
                messagePath: 'project.error.notFound',
            });
        });
    });

    describe('softDeleteByWorkspaceInTx', () => {
        it('delegates to the repository with the given transaction', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');

            await service.softDeleteByWorkspaceInTx(
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
        const pagination: IPaginationQueryOffsetParams = {
            where: { OR: [] },
            orderBy: [],
            limit: 20,
            skip: 0,
        };

        it('delegates to the repository with the workspace filter', async () => {
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

            const workspaceFilter = {
                workspaceId: { equals: '507f1f77bcf86cd799439012' },
            };

            const result = await service.getListOffsetByAdmin(
                pagination,
                workspaceFilter,
                null
            );

            expect(result).toBe(page);
            expect(
                projectRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, workspaceFilter, null);
        });
    });

    describe('getByIdByAdmin', () => {
        it('throws ProjectNotFoundException when the repository finds nothing', async () => {
            projectRepository.findByIdByAdmin.mockResolvedValue(null);

            const rejection = service.getByIdByAdmin(
                '507f1f77bcf86cd799439011',
                null
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

        it('returns the project resolved by id', async () => {
            const project = baseProject;
            projectRepository.findByIdByAdmin.mockResolvedValue(project);

            const result = await service.getByIdByAdmin(
                '507f1f77bcf86cd799439011',
                null
            );

            expect(result).toBe(project);
        });
    });

    describe('drawSlugCandidates', () => {
        it('draws slugMaxAttempts candidates from the prefix and max length', () => {
            const candidates = ['p-a', 'p-b', 'p-c', 'p-d', 'p-e'];
            helperStringService.generateSlugCandidates.mockReturnValue(
                candidates
            );

            const result = service['drawSlugCandidates']();

            expect(result).toBe(candidates);
            expect(
                helperStringService.generateSlugCandidates
            ).toHaveBeenCalledWith('p-', 30, 5);
        });
    });

    describe('isSlugAllowed', () => {
        it('returns true for a slug within length and matching the pattern', () => {
            expect(service['isSlugAllowed']('p-valid-slug')).toBe(true);
        });

        it('returns false for a slug over the max length', () => {
            expect(service['isSlugAllowed']('p-'.padEnd(31, 'a'))).toBe(false);
        });

        it('returns false for a slug failing the pattern', () => {
            expect(service['isSlugAllowed']('invalid slug!')).toBe(false);
        });
    });
});
