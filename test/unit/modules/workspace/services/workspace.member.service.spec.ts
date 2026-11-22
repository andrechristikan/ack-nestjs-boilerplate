import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { ConfigService } from '@nestjs/config';
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
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceHeaderMissingException } from '@modules/workspace/exceptions/workspace.header-missing.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { WorkspaceTransferTargetInactiveException } from '@modules/workspace/exceptions/workspace.transfer-target-inactive.exception';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('WorkspaceMemberService', () => {
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    let service: WorkspaceMemberService;

    const baseMember: WorkspaceMember = {
        ...buildWorkspaceMember('user-1'),
        role: EnumWorkspaceMemberRole.member,
    };
    const workspace: Workspace = buildWorkspace();

    beforeEach(async () => {
        activityLogQueue.recordEffect
            .mockReturnValueOnce(firstEntry)
            .mockReturnValueOnce(secondEntry);
        workspaceMemberRepository.updateRoleInTx.mockResolvedValue(true);
        workspaceMemberRepository.removeMemberInTx.mockResolvedValue(true);
        workspaceMemberRepository.promoteToOwnerInTx.mockResolvedValue(true);
        workspaceMemberRepository.demoteOwnerInTx.mockResolvedValue(true);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberService,
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceJoinRequestRepository,
                    useValue: workspaceJoinRequestRepository,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();

        service = module.get(WorkspaceMemberService);
    });

    describe('validateWorkspaceGuard', () => {
        it('throws WorkspaceMemberForbiddenException after one repository call when the workspace holds no member row', async () => {
            workspaceRepository.findActiveByIdWithMember.mockResolvedValue({
                ...workspace,
                members: [],
            });

            await expect(
                service.validateWorkspaceGuard('workspace-1', 'user-1', [])
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
            });
            expect(
                workspaceRepository.findActiveByIdWithMember
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceRepository.findActiveByIdWithMember
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });

        it('throws WorkspaceHeaderMissingException with no repository call when the id is null', async () => {
            await expect(
                service.validateWorkspaceGuard(null, 'user-1', [])
            ).rejects.toMatchObject({
                constructor: WorkspaceHeaderMissingException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.headerMissing,
            });
            expect(
                workspaceRepository.findActiveByIdWithMember
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceNotFoundException when the repository answers null', async () => {
            workspaceRepository.findActiveByIdWithMember.mockResolvedValue(
                null
            );

            await expect(
                service.validateWorkspaceGuard('workspace-1', 'user-1', [])
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
        });

        it('throws WorkspaceRoleForbiddenException when the member is neither owner nor in the allowed roles', async () => {
            workspaceRepository.findActiveByIdWithMember.mockResolvedValue({
                ...workspace,
                members: [baseMember],
            });

            await expect(
                service.validateWorkspaceGuard('workspace-1', 'user-1', [
                    EnumWorkspaceMemberRole.admin,
                ])
            ).rejects.toMatchObject({
                constructor: WorkspaceRoleForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
            });
        });

        it('passes an owner whatever the allowed roles', async () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };
            workspaceRepository.findActiveByIdWithMember.mockResolvedValue({
                ...workspace,
                members: [owner],
            });

            const result = await service.validateWorkspaceGuard(
                'workspace-1',
                'user-1',
                [EnumWorkspaceMemberRole.admin]
            );

            expect(result.workspaceMember).toBe(owner);
        });

        it('returns the workspace without its members and the member row', async () => {
            workspaceRepository.findActiveByIdWithMember.mockResolvedValue({
                ...workspace,
                members: [baseMember],
            });

            const result = await service.validateWorkspaceGuard(
                'workspace-1',
                'user-1',
                []
            );

            expect(result).toEqual({
                workspaceId: 'workspace-1',
                workspace,
                workspaceMember: baseMember,
            });
        });
    });

    describe('getOneByWorkspaceAndUser', () => {
        it('delegates to the repository', async () => {
            const member = baseMember;
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            const result = await service.getOneByWorkspaceAndUser(
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(member);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });
    });

    describe('resolveLastWorkspaceId', () => {
        it('answers null with no read for a null input', async () => {
            const result = await service.resolveLastWorkspaceId('user-1', null);

            expect(result).toBeNull();
            expect(
                workspaceMemberRepository.existsActiveByWorkspaceAndUser
            ).not.toHaveBeenCalled();
        });

        it('answers null when no active membership exists', async () => {
            workspaceMemberRepository.existsActiveByWorkspaceAndUser.mockResolvedValue(
                false
            );

            const result = await service.resolveLastWorkspaceId(
                'user-1',
                'workspace-1'
            );

            expect(result).toBeNull();
            expect(
                workspaceMemberRepository.existsActiveByWorkspaceAndUser
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberRepository.existsActiveByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });

        it('answers the id when an active membership exists', async () => {
            workspaceMemberRepository.existsActiveByWorkspaceAndUser.mockResolvedValue(
                true
            );

            const result = await service.resolveLastWorkspaceId(
                'user-1',
                'workspace-1'
            );

            expect(result).toBe('workspace-1');
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const member = baseMember;
            workspaceMemberRepository.createInTx.mockResolvedValue(member);

            const result = await service.createInTx(
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
    describe('getTransferTarget', () => {
        const target = { ...baseMember, id: 'member-2', userId: 'user-2' };
        const activeTarget = {
            ...target,
            user: { status: EnumUserStatus.active, deletedAt: null },
        };

        it('throws WorkspaceSelfTransferException when the target is the actor', async () => {
            await expect(
                service.getTransferTarget(authContext, 'workspace-1', 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceSelfTransferException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
            });
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUserWithUser
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberNotFoundException when the target is not a member', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUserWithUser.mockResolvedValue(
                null
            );

            await expect(
                service.getTransferTarget(authContext, 'workspace-1', 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it.each([
            {
                label: 'is not active',
                user: { status: EnumUserStatus.inactive, deletedAt: null },
            },
            {
                label: 'is deleted',
                user: {
                    status: EnumUserStatus.active,
                    deletedAt: new Date('2026-01-02T00:00:00.000Z'),
                },
            },
        ])(
            'throws WorkspaceTransferTargetInactiveException when the target account $label',
            async ({ user }) => {
                workspaceMemberRepository.findOneByWorkspaceAndUserWithUser.mockResolvedValue(
                    { ...target, user }
                );

                await expect(
                    service.getTransferTarget(
                        authContext,
                        'workspace-1',
                        'user-2'
                    )
                ).rejects.toMatchObject({
                    constructor: WorkspaceTransferTargetInactiveException,
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.transferTargetInactive,
                });
            }
        );

        it('returns the active target member read by workspace and user', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUserWithUser.mockResolvedValue(
                activeTarget
            );

            await expect(
                service.getTransferTarget(authContext, 'workspace-1', 'user-2')
            ).resolves.toBe(activeTarget);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUserWithUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
        });
    });

    describe('getTransferByAdmin', () => {
        const activeUser = { status: EnumUserStatus.active, deletedAt: null };
        const owner = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            role: EnumWorkspaceMemberRole.owner,
            user: activeUser,
        };
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            user: activeUser,
        };

        beforeEach(() => {
            workspaceRepository.findActiveByIdWithTransferMembers.mockResolvedValue(
                { ...workspace, members: [owner, target] }
            );
        });

        it('throws WorkspaceNotFoundException for a missing or deleted workspace', async () => {
            workspaceRepository.findActiveByIdWithTransferMembers.mockResolvedValue(
                null
            );

            await expect(
                service.getTransferByAdmin('workspace-1', 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
            expect(
                workspaceRepository.findActiveByIdWithTransferMembers
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
        });

        it('throws WorkspaceSelfTransferException when the target is the current owner', async () => {
            workspaceRepository.findActiveByIdWithTransferMembers.mockResolvedValue(
                { ...workspace, members: [owner] }
            );

            await expect(
                service.getTransferByAdmin('workspace-1', 'user-1')
            ).rejects.toMatchObject({
                constructor: WorkspaceSelfTransferException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
            });
        });

        it('throws WorkspaceMemberNotFoundException when the workspace has no owner row', async () => {
            workspaceRepository.findActiveByIdWithTransferMembers.mockResolvedValue(
                { ...workspace, members: [target] }
            );

            await expect(
                service.getTransferByAdmin('workspace-1', 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it('throws WorkspaceMemberNotFoundException when the target is not a member', async () => {
            workspaceRepository.findActiveByIdWithTransferMembers.mockResolvedValue(
                { ...workspace, members: [owner] }
            );

            await expect(
                service.getTransferByAdmin('workspace-1', 'user-2')
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it.each([
            {
                label: 'is not active',
                user: { status: EnumUserStatus.blocked, deletedAt: null },
            },
            {
                label: 'is deleted',
                user: {
                    status: EnumUserStatus.active,
                    deletedAt: new Date('2026-01-02T00:00:00.000Z'),
                },
            },
        ])(
            'throws WorkspaceTransferTargetInactiveException when the target account $label',
            async ({ user }) => {
                workspaceRepository.findActiveByIdWithTransferMembers.mockResolvedValue(
                    { ...workspace, members: [owner, { ...target, user }] }
                );

                await expect(
                    service.getTransferByAdmin('workspace-1', 'user-2')
                ).rejects.toMatchObject({
                    constructor: WorkspaceTransferTargetInactiveException,
                    module: 'workspace',
                    statusCode:
                        EnumWorkspaceStatusCodeError.transferTargetInactive,
                });
            }
        );

        it('returns the owner member and the target member after one repository read', async () => {
            await expect(
                service.getTransferByAdmin('workspace-1', 'user-2')
            ).resolves.toEqual({ ownerMember: owner, targetMember: target });
            expect(
                workspaceRepository.findActiveByIdWithTransferMembers
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('transferOwnershipInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
        const target = { ...baseMember, id: 'member-2', userId: 'user-2' };
        const actorContext = buildAuthJwtAccessContext('actor-1');

        it('promotes the target and demotes the actor on the tx given, in that order', async () => {
            await service.transferOwnershipInTx(
                tx,
                requestContext,
                apiKeyContext,
                actorContext,
                'workspace-1',
                actor,
                target
            );

            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'member-1', 'member-2');
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'member-1');
            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).toHaveBeenCalledBefore(workspaceMemberRepository.demoteOwnerInTx);
        });

        it('adds the owner entry and the new owner entry after the swap on the same tx', async () => {
            await service.transferOwnershipInTx(
                tx,
                requestContext,
                apiKeyContext,
                actorContext,
                'workspace-1',
                actor,
                target
            );

            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                actorContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceOwnershipTransferred,
                    userId: 'actor-1',
                    createdBy: 'actor-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                actorContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                    userId: 'user-2',
                    createdBy: 'actor-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'actor-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledBefore(activityLogQueue.recordEffect);
        });

        it('throws WorkspaceMemberPeerForbiddenException and demotes nothing when the promote misses', async () => {
            workspaceMemberRepository.promoteToOwnerInTx.mockResolvedValue(
                false
            );

            await expect(
                service.transferOwnershipInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    actorContext,
                    'workspace-1',
                    actor,
                    target
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            });
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException and adds no entry when the demote misses', async () => {
            workspaceMemberRepository.demoteOwnerInTx.mockResolvedValue(false);

            await expect(
                service.transferOwnershipInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    actorContext,
                    'workspace-1',
                    actor,
                    target
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('transferOwnershipByAdminInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const adminContext = buildAuthJwtAccessContext('admin-1');
        const owner = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            role: EnumWorkspaceMemberRole.owner,
        };
        const target = { ...baseMember, id: 'member-2', userId: 'user-2' };
        const thirdEntry = buildActivityLogCreateManyEffect('third-entry');

        beforeEach(() => {
            activityLogQueue.recordEffect.mockReset();
            activityLogQueue.recordEffect
                .mockReturnValueOnce(firstEntry)
                .mockReturnValueOnce(secondEntry)
                .mockReturnValueOnce(thirdEntry);
        });

        it('swaps the owner on the tx given and adds the admin, previous owner, and new owner entries after the swap', async () => {
            await service.transferOwnershipByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                adminContext,
                'workspace-1',
                { ownerMember: owner, targetMember: target }
            );

            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'member-1', 'member-2');
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledWith(tx, 'workspace-1', 'member-1');
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                adminContext,
                null,
                {
                    action: EnumActivityLogAction.adminWorkspaceOwnershipTransferred,
                    userId: 'admin-1',
                    createdBy: 'admin-1',
                    workspaceId: 'workspace-1',
                    metadata: {
                        workspaceId: 'workspace-1',
                        previousOwnerUserId: 'user-1',
                        targetUserId: 'user-2',
                    },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                adminContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceOwnershipRemovedByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    workspaceId: 'workspace-1',
                    metadata: {
                        actorUserId: 'admin-1',
                        targetUserId: 'user-2',
                    },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                3,
                requestContext,
                apiKeyContext,
                adminContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceOwnershipTransferredByAdmin,
                    userId: 'user-2',
                    createdBy: 'admin-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'admin-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
                thirdEntry,
            ]);
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledBefore(activityLogQueue.recordEffect);
        });

        it('throws WorkspaceMemberPeerForbiddenException when the promote misses', async () => {
            workspaceMemberRepository.promoteToOwnerInTx.mockResolvedValue(
                false
            );

            await expect(
                service.transferOwnershipByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    { ownerMember: owner, targetMember: target }
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            });
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the demote misses', async () => {
            workspaceMemberRepository.demoteOwnerInTx.mockResolvedValue(false);

            await expect(
                service.transferOwnershipByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    { ownerMember: owner, targetMember: target }
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('removeByUserInTx', () => {
        it('removes every membership of the user on the given transaction', async () => {
            const tx = {} as IDatabaseTransactionClient;
            workspaceMemberRepository.removeByUserInTx.mockResolvedValue(3);

            await expect(service.removeByUserInTx(tx, 'user-1')).resolves.toBe(
                3
            );

            expect(
                workspaceMemberRepository.removeByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-1');
        });
    });

    describe('assertLeavable', () => {
        it('throws WorkspaceLastOwnerException for an owner', () => {
            const owner = {
                ...baseMember,
                role: EnumWorkspaceMemberRole.owner,
            };

            try {
                service.assertLeavable(owner);
                expect.unreachable();
            } catch (error: unknown) {
                expect(error).toMatchObject({
                    constructor: WorkspaceLastOwnerException,
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.lastOwner,
                });
            }
        });

        it('returns for a non-owner', () => {
            expect(service.assertLeavable(baseMember)).toBeUndefined();
        });
    });

    describe('leaveWorkspaceInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('removes the member on the given transaction guarded by its role', async () => {
            await service.leaveWorkspaceInTx(tx, baseMember);

            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-1',
                EnumWorkspaceMemberRole.member
            );
        });

        it('cancels the pending join request of the member user on the same transaction after the removal', async () => {
            await service.leaveWorkspaceInTx(tx, baseMember);

            expect(
                workspaceJoinRequestRepository.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(
                tx,
                baseMember.workspaceId,
                baseMember.userId
            );
        });

        it('throws WorkspaceMemberNotFoundException and cancels nothing when the guarded removal misses', async () => {
            workspaceMemberRepository.removeMemberInTx.mockResolvedValue(false);

            await expect(
                service.leaveWorkspaceInTx(tx, baseMember)
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
            expect(
                workspaceJoinRequestRepository.cancelPendingByUserInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('getMembersList', () => {
        it('delegates to the repository cursor listing', async () => {
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getMembersList(
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
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceMemberRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            const result = await service.getMembersList(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });
    });

    describe('getPeerTarget', () => {
        const actor = {
            ...baseMember,
            id: 'member-1',
            userId: 'row-user',
            role: EnumWorkspaceMemberRole.admin,
        };
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
            user: { email: 'user-2@example.com' },
        };

        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.getPeerTarget(
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
        });

        it('throws WorkspaceMemberPeerForbiddenException when the actor targets itself', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                userId: 'user-1',
            });

            await expect(
                service.getPeerTarget(
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2'
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                constructor: WorkspaceMemberPeerForbiddenException,
            });
        });

        it('throws WorkspaceMemberPeerForbiddenException when an admin acts on an admin', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                role: EnumWorkspaceMemberRole.admin,
            });

            await expect(
                service.getPeerTarget(
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
            });
        });

        it('returns the target row with its email read by id and workspace', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            await expect(
                service.getPeerTarget(
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2'
                )
            ).resolves.toBe(target);
            expect(
                workspaceMemberRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('member-2', 'workspace-1');
        });
    });

    describe('updateMemberRoleInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const actorContext = buildAuthJwtAccessContext('actor-1');
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
        };

        it('updates the role guarded by the role read and adds both entries after the write on one tx', async () => {
            await service.updateMemberRoleInTx(
                tx,
                requestContext,
                apiKeyContext,
                actorContext,
                'workspace-1',
                target,
                EnumWorkspaceMemberRole.admin
            );

            expect(
                workspaceMemberRepository.updateRoleInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-2',
                EnumWorkspaceMemberRole.member,
                EnumWorkspaceMemberRole.admin
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                actorContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                    userId: 'actor-1',
                    createdBy: 'actor-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                actorContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                    userId: 'user-2',
                    createdBy: 'actor-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'actor-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
            expect(
                workspaceMemberRepository.updateRoleInTx
            ).toHaveBeenCalledBefore(activityLogQueue.recordEffect);
        });

        it('throws WorkspaceMemberPeerForbiddenException and adds no entry when the target role changed since it was read', async () => {
            workspaceMemberRepository.updateRoleInTx.mockResolvedValue(false);

            await expect(
                service.updateMemberRoleInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    actorContext,
                    'workspace-1',
                    target,
                    EnumWorkspaceMemberRole.admin
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('removeMemberInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            role: EnumWorkspaceMemberRole.member,
            user: { email: 'user-2@example.com' },
        };

        it('removes the member row given on the tx guarded by its role and reads nothing', async () => {
            await service.removeMemberInTx(tx, target);

            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-2',
                EnumWorkspaceMemberRole.member
            );
            expect(
                workspaceMemberRepository.findByIdAndWorkspace
            ).not.toHaveBeenCalled();
        });

        it('cancels the pending join request of the target user on the same transaction after the removal', async () => {
            await service.removeMemberInTx(tx, target);

            expect(
                workspaceJoinRequestRepository.cancelPendingByUserInTx
            ).toHaveBeenCalledWith(tx, target.workspaceId, 'user-2');
        });

        it('throws WorkspaceMemberPeerForbiddenException and cancels nothing when the target role changed since it was read', async () => {
            workspaceMemberRepository.removeMemberInTx.mockResolvedValue(false);

            await expect(
                service.removeMemberInTx(tx, target)
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(
                workspaceJoinRequestRepository.cancelPendingByUserInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('getMembersListByAdmin', () => {
        const pagination: IPaginationQueryOffsetParams = {
            limit: 20,
            skip: 0,
            orderBy: [],
        };

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
                service.getMembersListByAdmin('workspace-1', pagination)
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
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

            const result = await service.getMembersListByAdmin(
                'workspace-1',
                pagination
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith('workspace-1', pagination, null);
        });
    });

    describe('isPeerActionAllowed', () => {
        it('returns false when the target is an owner', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumWorkspaceMemberRole.owner,
                    EnumWorkspaceMemberRole.owner
                )
            ).toBe(false);
        });

        it('returns false when an admin acts on an admin', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumWorkspaceMemberRole.admin,
                    EnumWorkspaceMemberRole.admin
                )
            ).toBe(false);
        });

        it('returns true when an admin acts on a member', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumWorkspaceMemberRole.admin,
                    EnumWorkspaceMemberRole.member
                )
            ).toBe(true);
        });

        it('returns true when an owner acts on an admin', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumWorkspaceMemberRole.owner,
                    EnumWorkspaceMemberRole.admin
                )
            ).toBe(true);
        });
    });

    describe('hasRole', () => {
        it('returns true for an owner whatever the allowed roles', () => {
            expect(
                service['hasRole'](
                    { ...baseMember, role: EnumWorkspaceMemberRole.owner },
                    []
                )
            ).toBe(true);
        });

        it('returns true when the member role is allowed', () => {
            expect(
                service['hasRole'](
                    { ...baseMember, role: EnumWorkspaceMemberRole.admin },
                    [EnumWorkspaceMemberRole.admin]
                )
            ).toBe(true);
        });

        it('returns false when the member role is not allowed', () => {
            expect(
                service['hasRole'](baseMember, [EnumWorkspaceMemberRole.admin])
            ).toBe(false);
        });
    });
});
