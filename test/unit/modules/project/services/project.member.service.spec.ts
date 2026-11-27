import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
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
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
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
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('ProjectMemberService', () => {
    const projectMemberRepository: MockProxy<ProjectMemberRepository> =
        mock<ProjectMemberRepository>();
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
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
        hasWorkspaceBypass: true,
    };
    const plainActor: IProjectMemberActor = {
        hasWorkspaceBypass: false,
    };

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);

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
            projectMemberRepository.createInTx.mockResolvedValue();

            const result = await service.createInTx(
                tx,
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022',
                EnumProjectMemberRole.member,
                '507f1f77bcf86cd799439033'
            );

            expect(result).toBeUndefined();
            expect(projectMemberRepository.createInTx).toHaveBeenCalledTimes(1);
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

    describe('assertAssignable', () => {
        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass assigns the admin role', () => {
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: baseProject.workspaceId,
            };
            let captured: unknown;
            try {
                service.assertAssignable(
                    baseProject,
                    plainActor,
                    targetMember,
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

        it('throws WorkspaceMemberNotFoundException when targetMember is null', () => {
            let captured: unknown;
            try {
                service.assertAssignable(
                    baseProject,
                    bypassActor,
                    null,
                    EnumProjectMemberRole.member
                );
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it('throws WorkspaceMemberNotFoundException when targetMember belongs to another workspace', () => {
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: '507f1f77bcf86cd799439099',
            };
            let captured: unknown;
            try {
                service.assertAssignable(
                    baseProject,
                    bypassActor,
                    targetMember,
                    EnumProjectMemberRole.member
                );
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it('returns the target member of the project workspace', () => {
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: baseProject.workspaceId,
            };

            const result = service.assertAssignable(
                baseProject,
                bypassActor,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(result).toBe(targetMember);
        });
    });

    describe('getRoleUpdatableMember', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);

            const rejection = service.getRoleUpdatableMember(
                baseProject,
                bypassActor,
                '507f1f77bcf86cd799439021',
                EnumProjectMemberRole.admin
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
            });
            expect(
                projectMemberRepository.findByIdAndProject
            ).toHaveBeenCalledWith('507f1f77bcf86cd799439021', baseProject.id);
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', async () => {
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.getRoleUpdatableMember(
                baseProject,
                plainActor,
                targetMember.id,
                EnumProjectMemberRole.viewer
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass promotes a member to admin', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                baseProjectMember
            );

            const rejection = service.getRoleUpdatableMember(
                baseProject,
                plainActor,
                baseProjectMember.id,
                EnumProjectMemberRole.admin
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('returns the member when an actor without workspace bypass moves no admin role', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                baseProjectMember
            );

            const result = await service.getRoleUpdatableMember(
                baseProject,
                plainActor,
                baseProjectMember.id,
                EnumProjectMemberRole.viewer
            );

            expect(result).toBe(baseProjectMember);
        });

        it('returns the member read from the project', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                baseProjectMember
            );

            const result = await service.getRoleUpdatableMember(
                baseProject,
                bypassActor,
                baseProjectMember.id,
                EnumProjectMemberRole.admin
            );

            expect(result).toBe(baseProjectMember);
        });
    });

    describe('getRemovableMember', () => {
        it('throws ProjectMemberNotFoundException when the target member does not exist', async () => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(null);

            const rejection = service.getRemovableMember(
                authContext,
                baseProject,
                bypassActor,
                '507f1f77bcf86cd799439021'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
            });
            expect(
                projectMemberRepository.findByIdAndProject
            ).toHaveBeenCalledWith('507f1f77bcf86cd799439021', baseProject.id);
        });

        it('throws ProjectMemberPeerForbiddenException when the actor targets themselves', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: authContext.userId,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.getRemovableMember(
                authContext,
                baseProject,
                bypassActor,
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass removes an admin', async () => {
            const targetMember = {
                ...baseProjectMember,
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const rejection = service.getRemovableMember(
                authContext,
                baseProject,
                plainActor,
                targetMember.id
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
        });

        it('returns the member read from the project', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
            };
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                targetMember
            );

            const result = await service.getRemovableMember(
                authContext,
                baseProject,
                bypassActor,
                targetMember.id
            );

            expect(result).toBe(targetMember);
        });
    });

    describe('assignMemberInTx', () => {
        it('creates the member and adds both entries on the given tx, after the write', async () => {
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
            projectMemberRepository.createWithUserInTx.mockResolvedValue(
                created
            );

            const result = await service.assignMemberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.createInTx).not.toHaveBeenCalled();
            expect(
                projectMemberRepository.createWithUserInTx
            ).toHaveBeenCalledWith(
                tx,
                project.id,
                targetMember.userId,
                EnumProjectMemberRole.member,
                authContext.userId
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.projectMemberAssigned,
                    userId: authContext.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: targetMember.userId },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                    userId: targetMember.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: authContext.userId },
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
                userId: authContext.userId,
            };
            projectMemberRepository.createWithUserInTx.mockResolvedValue(
                baseProjectMemberRow
            );

            await service.assignMemberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                targetMember,
                EnumProjectMemberRole.member
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });
    });

    describe('updateMemberRoleInTx', () => {
        it('passes the exception the guarded write rejected with through untouched and adds no entry', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            const failure = new ProjectMemberPeerForbiddenException();
            projectMemberRepository.updateRoleInTx.mockRejectedValue(failure);

            const rejection = service.updateMemberRoleInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                targetMember,
                EnumProjectMemberRole.viewer
            );

            await expect(rejection).rejects.toBe(failure);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('updates the role guarded on the role it was given and adds both entries on the given tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            const written = {
                ...targetMember,
                userId: '507f1f77bcf86cd799439055',
                role: EnumProjectMemberRole.admin,
            };
            projectMemberRepository.updateRoleInTx.mockResolvedValue(written);

            await service.updateMemberRoleInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                targetMember,
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
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdated,
                    userId: authContext.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: written.userId },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: written.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: authContext.userId },
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
                userId: authContext.userId,
            };
            projectMemberRepository.updateRoleInTx.mockResolvedValue({
                ...targetMember,
                role: EnumProjectMemberRole.admin,
            });

            await service.updateMemberRoleInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                targetMember,
                EnumProjectMemberRole.admin
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
            ]);
        });
    });

    describe('removeMemberInTx', () => {
        it('passes the exception the guarded write rejected with through untouched and adds no entry', async () => {
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            const failure = new ProjectMemberPeerForbiddenException();
            projectMemberRepository.removeMemberInTx.mockRejectedValue(failure);

            const rejection = service.removeMemberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                targetMember
            );

            await expect(rejection).rejects.toBe(failure);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('removes the member guarded on the role it was given and adds both entries on the given tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                role: EnumProjectMemberRole.member,
            };
            const written = {
                ...targetMember,
                userId: '507f1f77bcf86cd799439055',
            };
            projectMemberRepository.removeMemberInTx.mockResolvedValue(written);

            await service.removeMemberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                project,
                targetMember
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
                {
                    action: EnumActivityLogAction.projectMemberRemoved,
                    userId: authContext.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { targetUserId: written.userId },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                    userId: written.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: authContext.userId },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });
    });

    describe('leaveProjectInTx', () => {
        it('passes the exception the delete rejected with through untouched and adds no entry', async () => {
            const failure = new ProjectMemberNotFoundException();
            projectMemberRepository.removeByIdInTx.mockRejectedValue(failure);

            const rejection = service.leaveProjectInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                baseProjectMember
            );

            await expect(rejection).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('removes the member by id whatever its role and adds the left entry on the given tx', async () => {
            const member = baseProjectMember;
            const written = {
                ...member,
                userId: '507f1f77bcf86cd799439055',
            };
            projectMemberRepository.removeByIdInTx.mockResolvedValue(written);

            await service.leaveProjectInTx(
                tx,
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
                {
                    action: EnumActivityLogAction.projectMemberLeft,
                    userId: written.userId,
                    createdBy: written.userId,
                    workspaceId: baseProject.workspaceId,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, firstEntry);
        });
    });
});
