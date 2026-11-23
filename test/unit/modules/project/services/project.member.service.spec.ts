import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectMemberLastAdminException } from '@modules/project/exceptions/project.member-last-admin.exception';
import { RoleService } from '@modules/role/services/role.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectMemberService', () => {
    const projectMemberRepository: MockProxy<ProjectMemberRepository> =
        mock<ProjectMemberRepository>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
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

    const baseProjectMember: IProjectMemberWithRole = {
        id: '507f1f77bcf86cd799439021',
        projectId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439022',
        roleId: 'role-project-member',
        role: {
            id: 'role-project-member',
            scope: EnumRoleScope.project,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
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

    const baseWorkspaceMember: IWorkspaceMemberWithRole = {
        id: '507f1f77bcf86cd799439031',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439032',
        roleId: 'role-workspace-member',
        role: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
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
        vi.resetAllMocks();
        roleService.getRefByIdForScope.mockImplementation(
            (id: string, scope: EnumRoleScope) =>
                Promise.resolve({
                    id,
                    scope,
                    key: id.replace(`role-${scope}-`, ''),
                    name: id,
                    policyRevision: 0,
                })
        );
        activityLogService.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        outboxService.withTransaction.mockImplementation(fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberService,
                {
                    provide: ProjectMemberRepository,
                    useValue: projectMemberRepository,
                },
                { provide: RoleService, useValue: roleService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        service = module.get(ProjectMemberService);
    });

    describe('getMemberOrNull', () => {
        it('returns the caller member row in the project', async () => {
            const member = baseProjectMember;
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                member
            );

            const result = await service.getMemberOrNull(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022'
            );

            expect(result).toBe(member);
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022'
            );
        });

        it('returns null when the caller has no row, leaving the decision to the policies', async () => {
            projectMemberRepository.findOneByProjectAndUser.mockResolvedValue(
                null
            );

            await expect(
                service.getMemberOrNull(
                    '507f1f77bcf86cd799439011',
                    '507f1f77bcf86cd799439022'
                )
            ).resolves.toBeNull();
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

            const result = await service.getMembersList(
                project,
                pagination,
                null
            );

            expect(result).toBe(page);
            expect(
                projectMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(project.id, pagination, null);
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
                EnumRoleProjectKey.member,
                '507f1f77bcf86cd799439033'
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439022',
                EnumRoleProjectKey.member,
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
                    EnumRoleProjectKey.admin
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
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
                    EnumRoleProjectKey.member
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
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
                EnumRoleProjectKey.member
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
            });
        });

        it('throws ProjectMemberAlreadyAssignedException when the create collides on the member unique index, with no read before the write', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const collision = new Error('member collision');
            projectMemberRepository.createInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    bypassActor,
                    targetMember,
                    EnumRoleProjectKey.member
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberAlreadyAssigned,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberAlreadyAssigned
                    ],
                messagePath: 'project.error.memberAlreadyAssigned',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'userId'
            );
            expect(
                projectMemberRepository.findOneByProjectAndUser
            ).not.toHaveBeenCalled();
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
                    EnumRoleProjectKey.member
                )
            ).rejects.toBe(appError);
            expect(databaseUtil.isUniqueCollision).not.toHaveBeenCalled();
        });

        it('wraps a non-collision create error in AppUnknownException', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseWorkspaceMember,
                workspaceId: project.workspaceId,
            };
            const otherError = new Error('unexpected');
            projectMemberRepository.createInTx.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.assignMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    project,
                    bypassActor,
                    targetMember,
                    EnumRoleProjectKey.member
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
                EnumRoleProjectKey.member
            );

            expect(result).toBe(created);
            expect(projectMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                project.id,
                targetMember.userId,
                EnumRoleProjectKey.member,
                bypassActor.userId
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
                EnumRoleProjectKey.member
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
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
                'role-project-admin',
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
                messagePath: 'project.error.memberNotFound',
            });
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                roleId: 'role-project-admin',
                role: {
                    id: 'role-project-admin',
                    scope: EnumRoleScope.project,
                    key: 'admin',
                    name: 'admin',
                    policyRevision: 0,
                },
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
                'role-project-viewer',
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
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
                roleId: 'role-project-member',
                role: {
                    id: 'role-project-member',
                    scope: EnumRoleScope.project,
                    key: 'member',
                    name: 'member',
                    policyRevision: 0,
                },
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
                'role-project-viewer',
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });

        it('updates the role guarded on the role it read and adds both entries on the same tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                roleId: 'role-project-member',
                role: {
                    id: 'role-project-member',
                    scope: EnumRoleScope.project,
                    key: 'member',
                    name: 'member',
                    policyRevision: 0,
                },
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
                'role-project-admin',
                null
            );

            expect(projectMemberRepository.updateRoleInTx).toHaveBeenCalledWith(
                tx,
                targetMember.id,
                'role-project-member',
                'role-project-admin'
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
                'role-project-admin',
                null
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
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
            const conflict = new Error('write-conflict');
            projectMemberRepository.updateRoleInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id,
                    'role-project-admin',
                    null
                )
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
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
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id,
                    'role-project-admin',
                    null
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('last project admin', () => {
        const adminTarget = {
            ...baseProjectMember,
            roleId: 'role-project-admin',
            role: {
                id: 'role-project-admin',
                scope: EnumRoleScope.project,
                key: 'admin',
                name: 'admin',
                policyRevision: 0,
            },
        };

        beforeEach(() => {
            projectMemberRepository.findByIdAndProject.mockResolvedValue(
                adminTarget
            );
        });

        it('refuses to demote the only admin and writes nothing', async () => {
            projectMemberRepository.countByProjectAndRoleKey.mockResolvedValue(
                1
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    adminTarget.id,
                    'role-project-viewer',
                    null
                )
            ).rejects.toThrow(ProjectMemberLastAdminException);
            expect(
                projectMemberRepository.countByProjectAndRoleKey
            ).toHaveBeenCalledWith(baseProject.id, 'admin');
            expect(
                projectMemberRepository.updateRoleInTx
            ).not.toHaveBeenCalled();
        });

        it('demotes an admin while another admin remains', async () => {
            projectMemberRepository.countByProjectAndRoleKey.mockResolvedValue(
                2
            );
            projectMemberRepository.updateRoleInTx.mockResolvedValue(true);

            await service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                bypassActor,
                adminTarget.id,
                'role-project-viewer',
                null
            );

            expect(projectMemberRepository.updateRoleInTx).toHaveBeenCalled();
        });

        it('keeps an admin an admin without counting admins', async () => {
            projectMemberRepository.updateRoleInTx.mockResolvedValue(true);

            await service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                baseProject,
                bypassActor,
                adminTarget.id,
                'role-project-admin',
                null
            );

            expect(
                projectMemberRepository.countByProjectAndRoleKey
            ).not.toHaveBeenCalled();
        });

        it('refuses to remove the only admin and writes nothing', async () => {
            projectMemberRepository.countByProjectAndRoleKey.mockResolvedValue(
                1
            );

            await expect(
                service.removeMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    adminTarget.id,
                    null
                )
            ).rejects.toThrow(ProjectMemberLastAdminException);
            expect(
                projectMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
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
                '507f1f77bcf86cd799439021',
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
                messagePath: 'project.error.memberNotFound',
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
                targetMember.id,
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass removes an admin', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                roleId: 'role-project-admin',
                role: {
                    id: 'role-project-admin',
                    scope: EnumRoleScope.project,
                    key: 'admin',
                    name: 'admin',
                    policyRevision: 0,
                },
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
                targetMember.id,
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
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
                roleId: 'role-project-member',
                role: {
                    id: 'role-project-member',
                    scope: EnumRoleScope.project,
                    key: 'member',
                    name: 'member',
                    policyRevision: 0,
                },
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
                targetMember.id,
                null
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });

        it('removes the member guarded on the role it read and adds both entries on the same tx', async () => {
            const project = baseProject;
            const targetMember = {
                ...baseProjectMember,
                userId: '507f1f77bcf86cd799439044',
                roleId: 'role-project-member',
                role: {
                    id: 'role-project-member',
                    scope: EnumRoleScope.project,
                    key: 'member',
                    name: 'member',
                    policyRevision: 0,
                },
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
                targetMember.id,
                null
            );

            expect(
                projectMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(tx, targetMember.id, 'role-project-member');
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
                new Error('write-conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.removeMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id,
                    null
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
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.removeMember(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    bypassActor,
                    targetMember.id,
                    null
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('leaveProject', () => {
        it('refuses the only admin leaving and removes nothing', async () => {
            projectMemberRepository.countByProjectAndRoleKey.mockResolvedValue(
                1
            );
            const adminMember = {
                ...baseProjectMember,
                role: { ...baseProjectMember.role, key: 'admin' },
            };

            await expect(
                service.leaveProject(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    baseProject,
                    adminMember
                )
            ).rejects.toThrow(ProjectMemberLastAdminException);
            expect(
                projectMemberRepository.removeByIdInTx
            ).not.toHaveBeenCalled();
        });

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
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
                messagePath: 'project.error.memberNotFound',
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
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
                new Error('write-conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
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
            databaseUtil.toException.mockReturnValue(null);

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
                service.assertPeerAllowed(bypassActor, EnumRoleProjectKey.admin)
            ).not.toThrow();
        });

        it('does not throw when no role involved is admin', () => {
            expect(() =>
                service.assertPeerAllowed(
                    plainActor,
                    EnumRoleProjectKey.member,
                    EnumRoleProjectKey.viewer
                )
            ).not.toThrow();
        });

        it('throws ProjectMemberPeerForbiddenException when an actor without workspace bypass touches an admin role', () => {
            let captured: unknown;
            try {
                service.assertPeerAllowed(
                    plainActor,
                    EnumRoleProjectKey.member,
                    EnumRoleProjectKey.admin
                );
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'project.error.memberPeerForbidden',
            });
        });
    });
});
