import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

describe('WorkspaceMemberDomain', () => {
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    let domain: WorkspaceMemberDomain;

    const baseMember: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.workspaceMemberLeft,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberDomain,
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceMemberDomain);
    });

    describe('validateWorkspaceMemberGuard', () => {
        it('throws UserNotAuthenticatedException when userId is null', async () => {
            await expect(
                domain.validateWorkspaceMemberGuard('workspace-1', null)
            ).rejects.toMatchObject({
                constructor: UserNotAuthenticatedException,
                module: 'user',
                statusCode: EnumUserStatusCodeError.notAuthenticated,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.notAuthenticated
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.notAuthenticated',
            });
        });

        it('throws WorkspaceNotFoundException when workspaceId is null', async () => {
            await expect(
                domain.validateWorkspaceMemberGuard(null, 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
        });

        it('throws WorkspaceMemberForbiddenException when no membership is found', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-1', 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberForbidden
                    ],
                messagePath: 'workspace.error.memberForbidden',
            });
        });

        it('returns the resolved membership', async () => {
            const member = baseMember;
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            const result = await domain.validateWorkspaceMemberGuard(
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(member);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });
    });

    describe('validateWorkspaceRoleGuard', () => {
        it('throws WorkspaceMemberForbiddenException when no member is given', () => {
            let thrown: unknown;
            try {
                domain.validateWorkspaceRoleGuard(null, [
                    EnumWorkspaceMemberRole.admin,
                ]);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: WorkspaceMemberForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'workspace.error.memberForbidden',
            });
        });

        it('returns the member unchecked when the role is owner', () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };

            const result = domain.validateWorkspaceRoleGuard(owner, [
                EnumWorkspaceMemberRole.admin,
            ]);

            expect(result).toBe(owner);
        });

        it('returns the member when its role is allowed', () => {
            const admin = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };

            const result = domain.validateWorkspaceRoleGuard(admin, [
                EnumWorkspaceMemberRole.admin,
            ]);

            expect(result).toBe(admin);
        });

        it('throws WorkspaceRoleForbiddenException when the role is not allowed', () => {
            const member = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.member,
            };

            let thrown: unknown;
            try {
                domain.validateWorkspaceRoleGuard(member, [
                    EnumWorkspaceMemberRole.admin,
                ]);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                constructor: WorkspaceRoleForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.roleForbidden
                    ],
                messagePath: 'workspace.error.roleForbidden',
            });
        });
    });

    describe('getOneByWorkspaceAndUser', () => {
        it('delegates to the repository', async () => {
            const member = baseMember;
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            const result = await domain.getOneByWorkspaceAndUser(
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(member);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const member = baseMember;
            workspaceMemberRepository.createInTx.mockResolvedValue(member);

            const result = await domain.createInTx(
                tx,
                'workspace-1',
                'user-1',
                EnumWorkspaceMemberRole.member,
                'actor-1'
            );

            expect(result).toBe(member);
            expect(workspaceMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-1',
                EnumWorkspaceMemberRole.member,
                'actor-1'
            );
        });
    });

    describe('transferOwnership', () => {
        it('throws WorkspaceSelfTransferException when the target is the actor', async () => {
            const actor = { ...baseMember, userId: 'user-1' };

            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceSelfTransferException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.selfTransfer
                    ],
                messagePath: 'workspace.error.selfTransfer',
            });
        });

        it('throws WorkspaceMemberNotFoundException when the target is not a member', async () => {
            const actor = { ...baseMember, userId: 'user-1' };
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                domain.transferOwnership('workspace-1', actor, 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
            });
        });

        it('transfers ownership and stages both actor and target activity logs', async () => {
            const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
            const target = { ...baseMember, id: 'member-2', userId: 'user-2' };
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            const transferredActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const transferredByOwnerActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(transferredActivityLog)
                .mockReturnValueOnce(transferredByOwnerActivityLog);

            await domain.transferOwnership('workspace-1', actor, 'user-2');

            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(
                workspaceMemberRepository.transferOwnership
            ).toHaveBeenCalledWith('member-1', 'member-2');
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                transferredActivityLog,
                transferredByOwnerActivityLog,
            ]);
        });
    });

    describe('leaveWorkspace', () => {
        it('throws WorkspaceLastOwnerException when the owner is the only one left', async () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };
            workspaceMemberRepository.countOwners.mockResolvedValue(1);

            await expect(
                domain.leaveWorkspace('workspace-1', owner)
            ).rejects.toMatchObject({
                constructor: WorkspaceLastOwnerException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.lastOwner,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.lastOwner
                    ],
                messagePath: 'workspace.error.lastOwner',
            });
            expect(
                workspaceMemberRepository.removeMember
            ).not.toHaveBeenCalled();
        });

        it('lets an owner leave when another owner remains', async () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };
            workspaceMemberRepository.countOwners.mockResolvedValue(2);
            const stagedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceMemberLeft,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

            await domain.leaveWorkspace('workspace-1', owner);

            expect(workspaceMemberRepository.removeMember).toHaveBeenCalledWith(
                owner.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('lets a non-owner leave without checking owner count', async () => {
            const member = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.member,
            };

            await domain.leaveWorkspace('workspace-1', member);

            expect(
                workspaceMemberRepository.countOwners
            ).not.toHaveBeenCalled();
            expect(workspaceMemberRepository.removeMember).toHaveBeenCalledWith(
                member.id
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('getMembersList', () => {
        it('delegates to the repository cursor listing', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getMembersList(
                'workspace-1',
                pagination,
                { role: { in: [EnumWorkspaceMemberRole.admin] } }
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, {
                role: { in: [EnumWorkspaceMemberRole.admin] },
            });
        });

        it('passes a null role filter when none is given', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await domain.getMembersList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });
    });

    describe('updateMemberRole', () => {
        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            const actor = { ...baseMember, userId: 'user-1' };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-2',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
            });
        });

        it('throws WorkspaceMemberPeerForbiddenException when the actor targets itself', async () => {
            const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                actor
            );

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-1',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
            expect(workspaceMemberRepository.updateRole).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException via assertPeerActionAllowed when the target is the owner', async () => {
            const actor = {
                ...baseMember,
                userId: 'user-1',
                role: EnumWorkspaceMemberRole.admin,
            };
            const target = {
                ...baseMember,
                id: 'member-2',
                userId: 'user-2',
                role: EnumWorkspaceMemberRole.owner,
            };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            await expect(
                domain.updateMemberRole(
                    'workspace-1',
                    actor,
                    'member-2',
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(workspaceMemberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('updates the role and stages the by-admin activity log when the target differs from the actor', async () => {
            const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
            const target = { ...baseMember, id: 'member-2', userId: 'user-2' };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            const actorActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const byAdminActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(actorActivityLog)
                .mockReturnValueOnce(byAdminActivityLog);

            await domain.updateMemberRole(
                'workspace-1',
                actor,
                'member-2',
                EnumWorkspaceMemberRole.admin
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorActivityLog,
                byAdminActivityLog,
            ]);
        });
    });

    describe('removeMember', () => {
        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            const actor = { ...baseMember, userId: 'user-1' };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                domain.removeMember('workspace-1', actor, 'member-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                messagePath: 'workspace.error.memberNotFound',
            });
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target is the actor itself', async () => {
            const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                actor
            );

            await expect(
                domain.removeMember('workspace-1', actor, 'member-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
        });

        it('throws WorkspaceMemberPeerForbiddenException via assertPeerActionAllowed for a peer admin', async () => {
            const actor = {
                ...baseMember,
                id: 'member-1',
                userId: 'user-1',
                role: EnumWorkspaceMemberRole.admin,
            };
            const target = {
                ...baseMember,
                id: 'member-2',
                userId: 'user-2',
                role: EnumWorkspaceMemberRole.admin,
            };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            await expect(
                domain.removeMember('workspace-1', actor, 'member-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(
                workspaceMemberRepository.removeMember
            ).not.toHaveBeenCalled();
        });

        it('removes the target member and stages the by-admin activity log in order', async () => {
            const actor = {
                ...baseMember,
                id: 'member-1',
                userId: 'user-1',
                role: EnumWorkspaceMemberRole.admin,
            };
            const target = {
                ...baseMember,
                id: 'member-2',
                userId: 'user-2',
                role: EnumWorkspaceMemberRole.member,
            };
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            const removedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceMemberRemoved,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            const removedByAdminActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                metadata: {},
                onError: false,
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare
                .mockReturnValueOnce(removedActivityLog)
                .mockReturnValueOnce(removedByAdminActivityLog);
            const callOrder: string[] = [];
            workspaceMemberRepository.removeMember.mockImplementation(
                async () => {
                    callOrder.push('removeMember');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await domain.removeMember('workspace-1', actor, 'member-2');

            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { targetUserId: 'user-2' },
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                userId: 'user-2',
                createdBy: 'user-1',
                workspaceId: 'workspace-1',
                metadata: { actorUserId: 'user-1' },
            });
            expect(workspaceMemberRepository.removeMember).toHaveBeenCalledWith(
                'member-2'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                removedActivityLog,
                removedByAdminActivityLog,
            ]);
            expect(callOrder).toEqual(['removeMember', 'stagePrepared']);
        });
    });

    describe('getMembersListByAdmin', () => {
        const workspace: Workspace = {
            id: 'workspace-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            name: 'Acme',
            slug: 'acme-team',
            description: null,
            isPublic: false,
        };
        const pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput> =
            { limit: 20, skip: 0, orderBy: [] };

        it('throws WorkspaceNotFoundException when the workspace does not exist', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(null);
            workspaceMemberRepository.findWithPaginationOffset.mockResolvedValue(
                {
                    type: EnumPaginationType.offset,
                    count: 0,
                    perPage: 20,
                    page: 1,
                    totalPage: 0,
                    hasNext: false,
                    hasPrevious: false,
                    data: [],
                }
            );

            await expect(
                domain.getMembersListByAdmin('workspace-1', pagination)
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                messagePath: 'workspace.error.notFound',
            });
        });

        it('returns the paginated members when the workspace exists', async () => {
            workspaceRepository.findByIdByAdmin.mockResolvedValue(workspace);
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationOffset.mockResolvedValue(
                page
            );

            const result = await domain.getMembersListByAdmin(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });
    });

    describe('assertPeerActionAllowed', () => {
        it('throws WorkspaceMemberPeerForbiddenException when the target is the owner', () => {
            const actor = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };
            const target = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };

            let thrown: unknown;
            try {
                domain['assertPeerActionAllowed'](actor, target);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
        });

        it('throws WorkspaceMemberPeerForbiddenException when an admin acts on another admin', () => {
            const actor = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };
            const target = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };

            let thrown: unknown;
            try {
                domain['assertPeerActionAllowed'](actor, target);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                messagePath: 'workspace.error.memberPeerForbidden',
            });
        });

        it('does not throw when an admin acts on a member', () => {
            const actor = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };
            const target = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.member,
            };

            expect(() =>
                domain['assertPeerActionAllowed'](actor, target)
            ).not.toThrow();
        });

        it('does not throw when the owner acts on an admin', () => {
            const actor = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };
            const target = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.admin,
            };

            expect(() =>
                domain['assertPeerActionAllowed'](actor, target)
            ).not.toThrow();
        });
    });
});
