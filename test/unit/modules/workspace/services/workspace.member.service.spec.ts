import { WorkspaceOwnerRoleNotAssignableException } from '@modules/workspace/exceptions/workspace.owner-role-not-assignable.exception';
import { RoleService } from '@modules/role/services/role.service';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { User, Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { WorkspaceTransferTargetInactiveException } from '@modules/workspace/exceptions/workspace.transfer-target-inactive.exception';
import { UserService } from '@modules/user/services/user.service';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceMemberService', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const firstEntry = buildActivityLogCreateManyEffect('first-entry');
    const secondEntry = buildActivityLogCreateManyEffect('second-entry');
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const targetUser = mock<User>({ id: 'user-2' });
    let service: WorkspaceMemberService;

    const baseMember: IWorkspaceMemberWithRole = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        roleId: 'role-workspace-member',
        role: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
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

    beforeEach(async () => {
        vi.resetAllMocks();
        roleService.getRefByScopeAndKey.mockImplementation(
            (scope: EnumRoleScope, key: string) =>
                Promise.resolve({
                    id: `role-${scope}-${key}`,
                    scope,
                    key,
                    name: key,
                    policyRevision: 0,
                })
        );
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
        featureFlagService.getMetadataNumber.mockResolvedValue(5);
        userService.getOneActive.mockResolvedValue(targetUser);
        activityLogService.recordEffect
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
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: UserService, useValue: userService },
                { provide: RoleService, useValue: roleService },
            ],
        }).compile();

        service = module.get(WorkspaceMemberService);
    });

    describe('validateWorkspaceMemberGuard', () => {
        it('throws WorkspaceMemberForbiddenException when no membership is found', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                service.validateWorkspaceMemberGuard('workspace-1', 'user-1')
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

            const result = await service.validateWorkspaceMemberGuard(
                'workspace-1',
                'user-1'
            );

            expect(result).toBe(member);
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
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
            expect(workspaceRepository.findActiveById).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).not.toHaveBeenCalled();
        });

        it('answers null for an inactive workspace', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                baseMember
            );

            const result = await service.resolveLastWorkspaceId(
                'user-1',
                'workspace-1'
            );

            expect(result).toBeNull();
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
        });

        it('answers null when the user is no longer a member', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            const result = await service.resolveLastWorkspaceId(
                'user-1',
                'workspace-1'
            );

            expect(result).toBeNull();
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-1');
        });

        it('answers the id otherwise', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                baseMember
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
                EnumRoleWorkspaceKey.member,
                'actor-1'
            );

            expect(result).toBe(member);
            expect(workspaceMemberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-1',
                EnumRoleWorkspaceKey.member,
                'actor-1'
            );
        });
    });
    describe('getReviewerUserIds', () => {
        it('returns the user ids of the workspace reviewers', async () => {
            workspaceMemberRepository.findReviewerUserIdsByWorkspace.mockResolvedValue(
                ['user-1', 'user-2']
            );

            const result = await service.getReviewerUserIds('workspace-1');

            expect(result).toEqual(['user-1', 'user-2']);
            expect(
                workspaceMemberRepository.findReviewerUserIdsByWorkspace
            ).toHaveBeenCalledWith('workspace-1');
        });
    });

    describe('transferOwnership', () => {
        const tx = {} as IDatabaseTransactionClient;
        const actor = { ...baseMember, id: 'member-1', userId: 'user-1' };
        const target = { ...baseMember, id: 'member-2', userId: 'user-2' };

        it('throws WorkspaceSelfTransferException when the target is the actor', async () => {
            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-1'
                )
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
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceTransferTargetInactiveException when the target account is not active, reading no flag and opening no transaction', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            userService.getOneActive.mockResolvedValue(null);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceTransferTargetInactiveException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.transferTargetInactive,
                messagePath: 'workspace.error.transferTargetInactive',
            });
            expect(userService.getOneActive).toHaveBeenCalledWith('user-2');
            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceCapReachedException for a target at the cap', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(5);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceCapReachedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.capReached
                    ],
                messagePath: 'workspace.error.capReached',
            });
            expect(workspaceService.countOwnedInTx).toHaveBeenCalledWith(
                tx,
                'user-2'
            );
            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).not.toHaveBeenCalled();
        });

        it('refuses a transfer to a user owning 2 workspaces when the flag caps at 2', async () => {
            featureFlagService.getMetadataNumber.mockResolvedValue(2);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(2);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toBeInstanceOf(WorkspaceCapReachedException);
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
        });

        it('allows a transfer to a user owning 2 workspaces when the flag caps at 3', async () => {
            featureFlagService.getMetadataNumber.mockResolvedValue(3);
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(2);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).resolves.toBeUndefined();
        });

        it('propagates FeatureFlagNotConfiguredException from the read and opens no transaction', async () => {
            const notConfigured = new FeatureFlagNotConfiguredException(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
            featureFlagService.getMetadataNumber.mockRejectedValue(
                notConfigured
            );
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toBe(notConfigured);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).not.toHaveBeenCalled();
        });

        it('transfers when both statements hit', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(4);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).resolves.toBeUndefined();

            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(workspaceService.countOwnedInTx).toHaveBeenCalledWith(
                tx,
                'user-2'
            );
            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'member-1',
                'member-2',
                'role-workspace-owner'
            );
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'member-1',
                'role-workspace-owner',
                'role-workspace-admin'
            );
            expect(workspaceService.countOwnedInTx).toHaveBeenCalledBefore(
                workspaceMemberRepository.promoteToOwnerInTx
            );
            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).toHaveBeenCalledBefore(workspaceMemberRepository.demoteOwnerInTx);
        });

        it('adds the owner entry and the new owner entry after the swap on the same tx', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(0);

            await service.transferOwnership(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                actor,
                'user-2'
            );

            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceOwnershipTransferred,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
        });

        it('throws WorkspaceMemberPeerForbiddenException when the promote misses', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(0);
            workspaceMemberRepository.promoteToOwnerInTx.mockResolvedValue(
                false
            );

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
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
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the demote misses', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(0);
            workspaceMemberRepository.demoteOwnerInTx.mockResolvedValue(false);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.withTransaction).not.toHaveResolved();
        });

        it('maps a write conflict in the ownership swap to WorkspaceMemberPeerForbiddenException', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            const conflict = new Error('write-conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            outboxService.withTransaction.mockRejectedValue(new Error('boom'));
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.transferOwnership(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'user-2'
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('transferOwnershipByAdmin', () => {
        const tx = {} as IDatabaseTransactionClient;
        const adminContext = buildAuthJwtAccessContext('admin-1');
        const owner = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            roleId: 'role-workspace-owner',
            role: {
                id: 'role-workspace-owner',
                scope: EnumRoleScope.workspace,
                key: 'owner',
                name: 'owner',
                policyRevision: 0,
            },
        };
        const target = { ...baseMember, id: 'member-2', userId: 'user-2' };
        const thirdEntry = buildActivityLogCreateManyEffect('third-entry');

        beforeEach(() => {
            workspaceRepository.findActiveById.mockResolvedValue(workspace);
            workspaceMemberRepository.findOneOwnerByWorkspace.mockResolvedValue(
                owner
            );
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                target
            );
            activityLogService.recordEffect.mockReset();
            activityLogService.recordEffect
                .mockReturnValueOnce(firstEntry)
                .mockReturnValueOnce(secondEntry)
                .mockReturnValueOnce(thirdEntry);
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
            workspaceService.countOwnedInTx.mockResolvedValue(0);
        });

        it('throws WorkspaceNotFoundException for a missing or deleted workspace', async () => {
            workspaceRepository.findActiveById.mockResolvedValue(null);

            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
            });
            expect(workspaceRepository.findActiveById).toHaveBeenCalledWith(
                'workspace-1'
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceSelfTransferException when the target is the current owner', async () => {
            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-1'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceSelfTransferException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.selfTransfer,
            });
            expect(
                workspaceMemberRepository.findOneOwnerByWorkspace
            ).toHaveBeenCalledWith('workspace-1');
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberNotFoundException when the workspace has no owner row', async () => {
            workspaceMemberRepository.findOneOwnerByWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberNotFoundException when the target is not a member', async () => {
            workspaceMemberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
            expect(
                workspaceMemberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceTransferTargetInactiveException when the target account is not active, reading no flag and opening no transaction', async () => {
            userService.getOneActive.mockResolvedValue(null);

            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceTransferTargetInactiveException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.transferTargetInactive,
                messagePath: 'workspace.error.transferTargetInactive',
            });
            expect(userService.getOneActive).toHaveBeenCalledWith('user-2');
            expect(featureFlagService.getMetadataNumber).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceCapReachedException for a target at the cap', async () => {
            workspaceService.countOwnedInTx.mockResolvedValue(5);

            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-2'
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceCapReachedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.capReached,
            });
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );
            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).not.toHaveBeenCalled();
        });

        it('swaps the owner guarded by the owner row and adds the admin, previous owner, and new owner entries on the same tx', async () => {
            await expect(
                service.transferOwnershipByAdmin(
                    requestContext,
                    apiKeyContext,
                    adminContext,
                    'workspace-1',
                    'user-2'
                )
            ).resolves.toBeUndefined();

            expect(
                workspaceMemberRepository.promoteToOwnerInTx
            ).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'member-1',
                'member-2',
                'role-workspace-owner'
            );
            expect(
                workspaceMemberRepository.demoteOwnerInTx
            ).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'member-1',
                'role-workspace-owner',
                'role-workspace-admin'
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                adminContext,
                null,
                {
                    action: EnumActivityLogAction.adminWorkspaceOwnershipTransfer,
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
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
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

    describe('leaveWorkspaceInTx', () => {
        const tx = {} as IDatabaseTransactionClient;

        it('throws WorkspaceLastOwnerException for an owner', async () => {
            const owner = {
                ...baseMember,
                roleId: 'role-workspace-owner',
                role: {
                    id: 'role-workspace-owner',
                    scope: EnumRoleScope.workspace,
                    key: 'owner',
                    name: 'owner',
                    policyRevision: 0,
                },
            };

            await expect(
                service.leaveWorkspaceInTx(tx, owner)
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
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('removes a non-owner on the given transaction', async () => {
            await service.leaveWorkspaceInTx(tx, baseMember);

            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(tx, 'member-1', 'role-workspace-member');
        });

        it('throws WorkspaceMemberNotFoundException when the guarded removal misses', async () => {
            workspaceMemberRepository.removeMemberInTx.mockResolvedValue(false);

            await expect(
                service.leaveWorkspaceInTx(tx, baseMember)
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
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
                { key: { in: [EnumRoleWorkspaceKey.admin] } },
                null
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(
                'workspace-1',
                pagination,
                { key: { in: [EnumRoleWorkspaceKey.admin] } },
                null
            );
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
                pagination,
                null,
                null
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-1', pagination, null, null);
        });
    });

    describe('updateMemberRole', () => {
        const tx = {} as IDatabaseTransactionClient;
        const actor = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            roleId: 'role-workspace-admin',
            role: {
                id: 'role-workspace-admin',
                scope: EnumRoleScope.workspace,
                key: 'admin',
                name: 'admin',
                policyRevision: 0,
            },
        };
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            roleId: 'role-workspace-member',
            role: {
                id: 'role-workspace-member',
                scope: EnumRoleScope.workspace,
                key: 'member',
                name: 'member',
                policyRevision: 0,
            },
        };

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(fn => fn(tx));
        });

        it('refuses the owner role before reading the target and writes nothing', async () => {
            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-owner',
                    null
                )
            ).rejects.toThrow(WorkspaceOwnerRoleNotAssignableException);
            expect(
                workspaceMemberRepository.findByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(
                workspaceMemberRepository.updateRoleInTx
            ).not.toHaveBeenCalled();
        });

        it('resolves the new role for the workspace scope', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toThrow(WorkspaceMemberNotFoundException);
            expect(roleService.getRefByIdForScope).toHaveBeenCalledWith(
                'role-workspace-admin',
                EnumRoleScope.workspace
            );
        });

        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
            expect(
                workspaceMemberRepository.updateRoleInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the actor targets itself', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                userId: 'user-1',
            });

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(
                workspaceMemberRepository.updateRoleInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when an admin acts on an admin', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                roleId: 'role-workspace-admin',
                role: {
                    id: 'role-workspace-admin',
                    scope: EnumRoleScope.workspace,
                    key: 'admin',
                    name: 'admin',
                    policyRevision: 0,
                },
            });

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(
                workspaceMemberRepository.updateRoleInTx
            ).not.toHaveBeenCalled();
        });

        it('updates the role guarded by the role read and adds both entries on one tx', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            await service.updateMemberRole(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                actor,
                'member-2',
                'role-workspace-admin',
                null
            );

            expect(
                workspaceMemberRepository.findByIdAndWorkspace
            ).toHaveBeenCalledWith('member-2', 'workspace-1', null);
            expect(
                workspaceMemberRepository.updateRoleInTx
            ).toHaveBeenCalledWith(
                tx,
                'member-2',
                'role-workspace-member',
                'role-workspace-admin'
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                    userId: 'user-1',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { targetUserId: 'user-2' },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                    userId: 'user-2',
                    createdBy: 'user-1',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'user-1' },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                firstEntry,
                secondEntry,
            ]);
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target role changed since it was read', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceMemberRepository.updateRoleInTx.mockResolvedValue(false);

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
        });

        it('maps a write conflict on the role swap to WorkspaceMemberPeerForbiddenException', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            const conflict = new Error('write-conflict');
            workspaceMemberRepository.updateRoleInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
        });

        it('wraps any other transaction error in AppUnknownException', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceMemberRepository.updateRoleInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.updateMemberRole(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'workspace-1',
                    actor,
                    'member-2',
                    'role-workspace-admin',
                    null
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    describe('removeMemberInTx', () => {
        const tx = {} as IDatabaseTransactionClient;
        const actor = {
            ...baseMember,
            id: 'member-1',
            userId: 'user-1',
            roleId: 'role-workspace-admin',
            role: {
                id: 'role-workspace-admin',
                scope: EnumRoleScope.workspace,
                key: 'admin',
                name: 'admin',
                policyRevision: 0,
            },
        };
        const target = {
            ...baseMember,
            id: 'member-2',
            userId: 'user-2',
            roleId: 'role-workspace-member',
            role: {
                id: 'role-workspace-member',
                scope: EnumRoleScope.workspace,
                key: 'member',
                name: 'member',
                policyRevision: 0,
            },
        };

        it('throws WorkspaceMemberNotFoundException when the target member does not exist', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                null
            );

            await expect(
                service.removeMemberInTx(
                    tx,
                    'workspace-1',
                    actor,
                    'member-2',
                    null
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberNotFoundException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                messagePath: 'workspace.error.memberNotFound',
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target is the actor itself', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                userId: 'user-1',
            });

            await expect(
                service.removeMemberInTx(
                    tx,
                    'workspace-1',
                    actor,
                    'member-2',
                    null
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('throws WorkspaceMemberPeerForbiddenException when an admin acts on an admin', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...target,
                roleId: 'role-workspace-admin',
                role: {
                    id: 'role-workspace-admin',
                    scope: EnumRoleScope.workspace,
                    key: 'admin',
                    name: 'admin',
                    policyRevision: 0,
                },
            });

            await expect(
                service.removeMemberInTx(
                    tx,
                    'workspace-1',
                    actor,
                    'member-2',
                    null
                )
            ).rejects.toMatchObject({
                constructor: WorkspaceMemberPeerForbiddenException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                messagePath: 'workspace.error.memberPeerForbidden',
            });
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).not.toHaveBeenCalled();
        });

        it('removes the target member and returns it', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );

            const result = await service.removeMemberInTx(
                tx,
                'workspace-1',
                actor,
                'member-2',
                null
            );

            expect(result).toBe(target);
            expect(
                workspaceMemberRepository.removeMemberInTx
            ).toHaveBeenCalledWith(tx, 'member-2', 'role-workspace-member');
        });

        it('throws WorkspaceMemberPeerForbiddenException when the target role changed since it was read', async () => {
            workspaceMemberRepository.findByIdAndWorkspace.mockResolvedValue(
                target
            );
            workspaceMemberRepository.removeMemberInTx.mockResolvedValue(false);

            await expect(
                service.removeMemberInTx(
                    tx,
                    'workspace-1',
                    actor,
                    'member-2',
                    null
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,

                constructor: WorkspaceMemberPeerForbiddenException,
            });
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
                service.getMembersListByAdmin('workspace-1', pagination, null)
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

            const result = await service.getMembersListByAdmin(
                'workspace-1',
                pagination,
                null
            );

            expect(result).toBe(page);
            expect(
                workspaceMemberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith('workspace-1', pagination, null, null);
        });
    });

    describe('assertRoleAssignable', () => {
        const role = {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'Member',
            policyRevision: 0,
        };

        it('accepts a role other than owner', () => {
            expect(() => service.assertRoleAssignable(role)).not.toThrow();
        });

        it('refuses the owner role', () => {
            expect(() =>
                service.assertRoleAssignable({ ...role, key: 'owner' })
            ).toThrow(WorkspaceOwnerRoleNotAssignableException);
        });
    });

    describe('isPeerActionAllowed', () => {
        it('returns false when the target is an owner', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumRoleWorkspaceKey.owner,
                    EnumRoleWorkspaceKey.owner
                )
            ).toBe(false);
        });

        it('returns false when an admin acts on an admin', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumRoleWorkspaceKey.admin,
                    EnumRoleWorkspaceKey.admin
                )
            ).toBe(false);
        });

        it('returns true when an admin acts on a member', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumRoleWorkspaceKey.admin,
                    EnumRoleWorkspaceKey.member
                )
            ).toBe(true);
        });

        it('returns true when an owner acts on an admin', () => {
            expect(
                service['isPeerActionAllowed'](
                    EnumRoleWorkspaceKey.owner,
                    EnumRoleWorkspaceKey.admin
                )
            ).toBe(true);
        });
    });
});
