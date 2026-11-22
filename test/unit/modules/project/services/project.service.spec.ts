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
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectService', () => {
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = buildActivityLogCreateManyEffect('entry');
    let helperStringService: HelperStringService;
    let service: ProjectService;

    const configValues: Record<string, unknown> = {
        'project.slugPrefix': 'p-',
        'project.slugMaxLength': 30,
        'project.slugMaxAttempts': 5,
        'project.delete.chunkSize': 50,
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

    const baseWorkspaceMember: WorkspaceMember = buildWorkspaceMember(
        '507f1f77bcf86cd799439014'
    );

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(entry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectService,
                { provide: ProjectRepository, useValue: projectRepository },
                ...TestUnitKitProviders,
                ProjectUtil,
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        ...configValues,
                    }),
                },
            ],
        }).compile();
        service = module.get(ProjectService);
        helperStringService = module.get(HelperStringService);
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
                '507f1f77bcf86cd799439012'
            );
        });
    });

    describe('getListCursorByMember', () => {
        const pagination: IPaginationQueryCursorParams = {
            fingerprint: 'aaaaaaaaaaaaaaaa',
            where: { OR: [] },
            orderBy: [],
            limit: 20,
        };

        it('passes a null memberUserId when the caller is the workspace owner', async () => {
            const page: IResponsePaginationReturn<Project> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseProject],
            };
            projectRepository.findWithPaginationCursorForWorkspace.mockResolvedValue(
                page
            );
            const workspaceMember = {
                ...baseWorkspaceMember,
                role: EnumWorkspaceMemberRole.owner,
            };

            const result = await service.getListCursorByMember(
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
            projectRepository.findWithPaginationCursorForWorkspace.mockResolvedValue(
                page
            );
            const workspaceMember = {
                ...baseWorkspaceMember,
                role: EnumWorkspaceMemberRole.member,
            };

            await service.getListCursorByMember(
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

    describe('createProjectInTx', () => {
        const create: IProjectCreate = {
            name: 'Website Revamp',
            description: null,
        };

        it('creates the project with the given slug and adds the creator entry on the given tx', async () => {
            projectRepository.createInTx.mockResolvedValue(baseProject);

            const result = await service.createProjectInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                '507f1f77bcf86cd799439012',
                create,
                'p-abc123'
            );

            expect(result).toBe(baseProject);
            expect(projectRepository.createInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439012',
                create,
                'p-abc123'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
    });

    describe('updateProjectInTx', () => {
        it('updates the details and adds the entry on the given tx', async () => {
            const project = baseProject;
            const updated = { ...baseProject, name: 'New Name' };
            projectRepository.updateDetailsInTx.mockResolvedValue(updated);
            const update: IProjectUpdate = {
                name: 'New Name',
                description: null,
            };

            const result = await service.updateProjectInTx(
                tx,
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
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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

    describe('assertSlugAllowed', () => {
        it('throws ProjectSlugInvalidException when the slug is not allowed', () => {
            let captured: unknown;
            try {
                service.assertSlugAllowed('invalid slug!');
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
            });
        });

        it('does not throw for a slug within length and matching the pattern', () => {
            expect(() =>
                service.assertSlugAllowed('p-valid-slug')
            ).not.toThrow();
        });
    });

    describe('updateProjectSlugInTx', () => {
        it('updates the slug and adds the entry on the given tx', async () => {
            const project = baseProject;
            const updated = { ...baseProject, slug: 'p-new-slug' };
            projectRepository.updateSlugInTx.mockResolvedValue(updated);

            const result = await service.updateProjectSlugInTx(
                tx,
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
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
            });
        });
    });

    describe('softDeleteChunkByWorkspace', () => {
        it('passes the delete chunk size to the repository and returns the count it read', async () => {
            const deletedAt = new Date('2026-02-01T00:00:00.000Z');
            projectRepository.softDeleteChunkByWorkspace.mockResolvedValue(7);

            const result = await service.softDeleteChunkByWorkspace(
                '507f1f77bcf86cd799439012',
                deletedAt,
                '507f1f77bcf86cd799439015'
            );

            expect(result).toBe(7);
            expect(
                projectRepository.softDeleteChunkByWorkspace
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                deletedAt,
                '507f1f77bcf86cd799439015',
                50
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
                workspaceFilter
            );

            expect(result).toBe(page);
            expect(
                projectRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, workspaceFilter);
        });
    });

    describe('getByIdByAdmin', () => {
        it('throws ProjectNotFoundException when the repository finds nothing', async () => {
            projectRepository.findByIdByAdmin.mockResolvedValue(null);

            const rejection = service.getByIdByAdmin(
                '507f1f77bcf86cd799439011'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
            });
        });

        it('returns the project resolved by id', async () => {
            const project = baseProject;
            projectRepository.findByIdByAdmin.mockResolvedValue(project);

            const result = await service.getByIdByAdmin(
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(project);
        });
    });

    describe('drawSlugCandidates', () => {
        it('draws slugMaxAttempts candidates from the prefix and max length', () => {
            const candidates = ['p-a', 'p-b', 'p-c', 'p-d', 'p-e'];
            const generateSlugCandidates = vi
                .spyOn(helperStringService, 'generateSlugCandidates')
                .mockReturnValue(candidates);

            const result = service.drawSlugCandidates();

            expect(result).toBe(candidates);
            expect(generateSlugCandidates).toHaveBeenCalledWith('p-', 30, 5);
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
