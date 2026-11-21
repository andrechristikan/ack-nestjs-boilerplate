import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspaceMember,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';

describe('ProjectMemberService', () => {
    const projectMemberRepository: MockProxy<ProjectMemberRepository> =
        mock<ProjectMemberRepository>();
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('507f1f77bcf86cd799439033', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    let service: ProjectMemberService;

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

    const baseProjectMember: ProjectMember = {
        id: '507f1f77bcf86cd799439021',
        projectId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439022',
        role: EnumProjectMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseProjectMemberRow: IProjectMember = {
        ...baseProjectMember,
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

    const baseWorkspaceMember: WorkspaceMember = {
        ...buildWorkspaceMember('507f1f77bcf86cd799439032'),
        role: EnumWorkspaceMemberRole.member,
    };

    const bypassActor: IProjectMemberActor = {
        userId: '507f1f77bcf86cd799439033',
        hasWorkspaceBypass: true,
    };
    const plainActor: IProjectMemberActor = {
        userId: '507f1f77bcf86cd799439033',
        hasWorkspaceBypass: false,
    };

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        databaseService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberService,
                {
                    provide: ProjectMemberRepository,
                    useValue: projectMemberRepository,
                },
                { provide: ProjectRepository, useValue: projectRepository },
                ...TestUnitKitProviders,
                ProjectUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();
        service = module.get(ProjectMemberService);
    });

    describe('validateProjectGuard', () => {
        const projectId = '507f1f77bcf86cd799439011';
        const roleMember: WorkspaceMember = baseWorkspaceMember;
        const bypassMember: WorkspaceMember = {
            ...baseWorkspaceMember,
            role: EnumWorkspaceMemberRole.admin,
        };
        const memberRow: ProjectMember = {
            ...baseProjectMember,
            role: EnumProjectMemberRole.admin,
        };

        it('throws RequestContextMissingException when the project id is null', async () => {
            let thrown: unknown;
            try {
                await service.validateProjectGuard(roleMember, null, []);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, 'params.projectId');
            expect(
                projectRepository.findActiveByIdAndWorkspaceWithMember
            ).not.toHaveBeenCalled();
        });

        it('rejects with member forbidden when a workspace member with no roles has no project member row, after one repository call', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                { ...baseProject, members: [] }
            );

            await expect(
                service.validateProjectGuard(roleMember, 'p1', [])
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberForbidden,
            });
            expect(
                projectRepository.findActiveByIdAndWorkspaceWithMember
            ).toHaveBeenCalledTimes(1);
            expect(
                projectRepository.findActiveByIdAndWorkspaceWithMember
            ).toHaveBeenCalledWith(
                'p1',
                roleMember.workspaceId,
                roleMember.userId
            );
        });

        it('throws ProjectNotFoundException when the repository answers null', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                null
            );

            await expect(
                service.validateProjectGuard(roleMember, projectId, [])
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
            });
        });

        it('returns the project and the member row when no roles are required and a row exists', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                { ...baseProject, members: [memberRow] }
            );

            const result = await service.validateProjectGuard(
                roleMember,
                projectId,
                []
            );

            expect(result).toEqual({
                project: baseProject,
                projectMember: memberRow,
            });
        });

        it('returns a null project member when roles are required, the caller is a workspace admin, and no row exists', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                { ...baseProject, members: [] }
            );

            const result = await service.validateProjectGuard(
                bypassMember,
                projectId,
                [EnumProjectMemberRole.admin]
            );

            expect(result).toEqual({
                project: baseProject,
                projectMember: null,
            });
        });

        it('returns the row when roles are required, the caller is a workspace admin, and a row exists', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                { ...baseProject, members: [memberRow] }
            );

            const result = await service.validateProjectGuard(
                bypassMember,
                projectId,
                [EnumProjectMemberRole.viewer]
            );

            expect(result).toEqual({
                project: baseProject,
                projectMember: memberRow,
            });
        });

        it('throws member forbidden when roles are required, the caller is a workspace member, and no row exists', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                { ...baseProject, members: [] }
            );

            await expect(
                service.validateProjectGuard(roleMember, projectId, [
                    EnumProjectMemberRole.admin,
                ])
            ).rejects.toMatchObject({
                statusCode: EnumProjectStatusCodeError.memberForbidden,
            });
        });

        it('throws role forbidden when the row role is outside the list', async () => {
            projectRepository.findActiveByIdAndWorkspaceWithMember.mockResolvedValue(
                {
                    ...baseProject,
                    members: [
                        {
                            ...baseProjectMember,
                            role: EnumProjectMemberRole.viewer,
                        },
                    ],
                }
            );

            await expect(
                service.validateProjectGuard(roleMember, projectId, [
                    EnumProjectMemberRole.admin,
                ])
            ).rejects.toMatchObject({
                statusCode: EnumProjectStatusCodeError.roleForbidden,
            });
        });
    });

    describe('assertMember', () => {
        it('returns the member when one is given', () => {
            const member = baseProjectMember;

            expect(service.assertMember(member)).toBe(member);
        });

        it('throws ProjectMemberNotFoundException on null', () => {
            expect(() => service.assertMember(null)).toThrow(
                expect.objectContaining({
                    module: 'project',
                    statusCode: EnumProjectStatusCodeError.memberNotFound,
                })
            );
        });
    });

    describe('getMembersList', () => {
        it('delegates to the repository for the given project', async () => {
            const project = baseProject;
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                where: { OR: [] },
                orderBy: [],
                limit: 20,
            };
            const page: IResponsePaginationReturn<IProjectMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseProjectMemberRow],
            };
            projectMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getMembersList(project, pagination);

            expect(result).toBe(page);
            expect(
                projectMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(project.id, pagination);
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository with the given transaction', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            const created = baseProjectMemberRow;
            projectMemberRepository.createInTx.mockResolvedValue(created);

            const result = await service.createInTx(
                tx,
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022',
                EnumProjectMemberRole.member,
                '507f1f77bcf86cd799439033'
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022',
                EnumProjectMemberRole.member,
                '507f1f77bcf86cd799439033'
            );
        });
    });

    describe('removeByWorkspaceAndUserInTx', () => {
        it('removes the user project memberships of the workspace on the given transaction and returns the count', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            projectMemberRepository.removeByWorkspaceAndUserInTx.mockResolvedValue(
                3
            );

            const result = await service.removeByWorkspaceAndUserInTx(
                tx,
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439022'
            );

            expect(result).toBe(3);
            expect(
                projectMemberRepository.removeByWorkspaceAndUserInTx
            ).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439022'
            );
        });
    });

    describe('removeByUserInTx', () => {
        it('removes every project membership of the user on the given transaction and returns the count', async () => {
            const tx: MockProxy<IDatabaseTransactionClient> =
                mock<IDatabaseTransactionClient>();
            projectMemberRepository.removeByUserInTx.mockResolvedValue(4);

            const result = await service.removeByUserInTx(
                tx,
                '507f1f77bcf86cd799439022'
            );

            expect(result).toBe(4);
            expect(
                projectMemberRepository.removeByUserInTx
            ).toHaveBeenCalledWith(tx, '507f1f77bcf86cd799439022');
        });
    });

    describe('assignMember', () => {
        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass assigns the admin role', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    plainActor,
                    targetMember,
                    EnumProjectMemberRole.admin
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
            expect(projectMemberRepository.createInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberNotFoundException when targetMember is null', async () => {
            const project = baseProject;

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    bypassActor,
                    null,
                    EnumProjectMemberRole.member
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it('throws WorkspaceMemberNotFoundException when targetMember belongs to another workspace', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: '507f1f77bcf86cd799439099',
            };

            const rejection = service.assignMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                targetMember,
                EnumProjectMemberRole.member
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it('throws ProjectMemberAlreadyAssignedException when the create collides on the member unique index, with no read before the write', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const collision = buildPrismaKnownRequestError('P2002', 'userId');
            projectMemberRepository.createInTx.mockRejectedValue(collision);

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    bypassActor,
                    targetMember,
                    EnumProjectMemberRole.member
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberAlreadyAssigned,
            });
        });

        it('rethrows an AppBaseException from the transaction as is, with no collision check', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const appError = new DatabaseWriteConflictException();
            projectMemberRepository.createInTx.mockRejectedValue(appError);

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    bypassActor,
                    targetMember,
                    EnumProjectMemberRole.member
                )
            ).rejects.toBe(appError);
        });

        it('wraps a non-collision create error in AppUnknownException', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const otherError = new Error('unexpected');
            projectMemberRepository.createInTx.mockRejectedValue(otherError);

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    bypassActor,
                    targetMember,
                    EnumProjectMemberRole.member
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('assigns the target member, returns the created row, and adds both entries on the same tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
                userId: '507f1f77bcf86cd799439044',
            };
            const created = {
                ...baseProjectMemberRow,
                userId: targetMember.userId,
            };
            projectMemberRepository.createInTx.mockResolvedValue(created);

            const result = await service.assignMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                project.id,
                targetMember.userId,
                EnumProjectMemberRole.member,
                bypassActor.userId
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberAssigned,
                    userId: bypassActor.userId,
                    createdBy: bypassActor.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                    userId: targetMember.userId,
                    createdBy: bypassActor.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: bypassActor.userId },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('adds only the actor entry when the actor assigns itself', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
                userId: bypassActor.userId,
            };
            projectMemberRepository.createInTx.mockResolvedValue(
                baseProjectMemberRow
            );

            await service.assignMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });
    });

    describe('updateMemberRole', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);
            const project = baseProject;

            const rejection = service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                '507f1f77bcf86cd799439021',
                EnumProjectMemberRole.admin
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
            });
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                plainActor,
                targetMember.id,
                EnumProjectMemberRole.viewer
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
            expect(
                projectMemberRepository.updateRoleInTx
            ).not.toHaveBeenCalled();
        });

        it('throws ProjectMemberPeerForbiddenException when the guarded write misses', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRoleInTx.mockResolvedValue(false);

            const rejection = service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                plainActor,
                targetMember.id,
                EnumProjectMemberRole.viewer
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('updates the role guarded on the role it read and adds both entries on the same tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRoleInTx.mockResolvedValue(true);

            await service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                targetMember.id,
                EnumProjectMemberRole.admin
            );

            expect(projectMemberRepository.updateRoleInTx).toHaveBeenCalledWith(
                tx,
                targetMember.id,
                EnumProjectMemberRole.member,
                EnumProjectMemberRole.admin
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdated,
                    userId: bypassActor.userId,
                    createdBy: bypassActor.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: targetMember.userId,
                    createdBy: bypassActor.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: bypassActor.userId },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('adds only the actor entry when the actor changes its own role', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: bypassActor.userId,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRoleInTx.mockResolvedValue(true);

            await service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                bypassActor,
                targetMember.id,
                EnumProjectMemberRole.admin
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });

        it('maps a write conflict on the guarded write to ProjectMemberPeerForbiddenException', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRoleInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id,
                    EnumProjectMemberRole.admin
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.updateRoleInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id,
                    EnumProjectMemberRole.admin
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('removeMember', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);
            const project = baseProject;

            const rejection = service.removeMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                '507f1f77bcf86cd799439021'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
            });
        });

        it('throws ProjectMemberPeerForbiddenException when the actor targets themselves', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: bypassActor.userId,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.removeMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass removes an admin', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.removeMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                plainActor,
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
            expect(
                projectMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('throws ProjectMemberPeerForbiddenException when the guarded write misses', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.removeMemberInTx.mockResolvedValue(false);

            const rejection = service.removeMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                plainActor,
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('removes the member guarded on the role it read and adds both entries on the same tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.removeMemberInTx.mockResolvedValue(true);

            await service.removeMember(
                requestContext,
                apiKeyContext,
                authContext,
                project,
                bypassActor,
                targetMember.id
            );

            expect(
                projectMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                targetMember.id,
                EnumProjectMemberRole.member
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberRemoved,
                    userId: bypassActor.userId,
                    createdBy: bypassActor.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                    userId: targetMember.userId,
                    createdBy: bypassActor.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: bypassActor.userId },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('maps a write conflict on the guarded write to ProjectMemberPeerForbiddenException', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.removeMemberInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                service.removeMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );
            projectMemberRepository.removeMemberInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.removeMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('leaveProject', () => {
        it('throws ProjectMemberNotFoundException and adds no entry when the row is gone', async () => {
            projectMemberRepository.removeByIdInTx.mockResolvedValue(false);

            const rejection = service.leaveProject(
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                baseProjectMember
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('removes the member by id whatever its role and adds the left entry on the same tx', async () => {
            const member = baseProjectMember;
            projectMemberRepository.removeByIdInTx.mockResolvedValue(true);

            await service.leaveProject(
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                member
            );

            expect(projectMemberRepository.removeByIdInTx).toHaveBeenCalledWith(
                tx,
                member.id
            );
            expect(
                projectMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberLeft,
                    userId: member.userId,
                    createdBy: member.userId,
                    workspaceId: baseProject.workspaceId,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
        });

        it('maps a write conflict to ProjectMemberNotFoundException', async () => {
            projectMemberRepository.removeByIdInTx.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                service.leaveProject(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    baseProjectMember
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            projectMemberRepository.removeByIdInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.leaveProject(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    baseProjectMember
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('assertPeerAllowed', () => {
        it('does not throw when the actor has workspace bypass', () => {
            expect(() =>
                service.assertPeerAllowed(
                    bypassActor,
                    EnumProjectMemberRole.admin
                )
            ).not.toThrow();
        });

        it('does not throw when no role involved is admin', () => {
            expect(() =>
                service.assertPeerAllowed(
                    plainActor,
                    EnumProjectMemberRole.member,
                    EnumProjectMemberRole.viewer
                )
            ).not.toThrow();
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', () => {
            let captured: unknown;
            try {
                service.assertPeerAllowed(
                    plainActor,
                    EnumProjectMemberRole.member,
                    EnumProjectMemberRole.admin
                );
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });
    });
});
