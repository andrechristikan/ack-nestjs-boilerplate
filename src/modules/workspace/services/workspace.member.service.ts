import type { IRoleRef } from '@modules/role/interfaces/role.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { RoleService } from '@modules/role/services/role.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceOwnerRoleNotAssignableException } from '@modules/workspace/exceptions/workspace.owner-role-not-assignable.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { WorkspaceTransferTargetInactiveException } from '@modules/workspace/exceptions/workspace.transfer-target-inactive.exception';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceMemberService {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceService: WorkspaceService,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private isPeerActionAllowed(actorKey: string, targetKey: string): boolean {
        if (targetKey === EnumRoleWorkspaceKey.owner) {
            return false;
        }

        return !(
            actorKey === EnumRoleWorkspaceKey.admin &&
            targetKey === EnumRoleWorkspaceKey.admin
        );
    }

    private assertPeerActionAllowed(
        actorMember: IWorkspaceMemberWithRole,
        targetMember: IWorkspaceMemberWithRole
    ): void {
        const isAllowed = this.isPeerActionAllowed(
            actorMember.role.key,
            targetMember.role.key
        );
        if (!isAllowed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    private async transferOwnershipGuarded(
        workspaceId: string,
        ownerMember: IWorkspaceMemberWithRole,
        targetMember: IWorkspaceMemberWithRole,
        entries: IOutboxEffect[]
    ): Promise<void> {
        const [ownerRole, adminRole] = await Promise.all([
            this.roleService.getRefByScopeAndKey(
                EnumRoleScope.workspace,
                EnumRoleWorkspaceKey.owner
            ),
            this.roleService.getRefByScopeAndKey(
                EnumRoleScope.workspace,
                EnumRoleWorkspaceKey.admin
            ),
        ]);
        const maxWorkspacesPerUser =
            await this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.maxWorkspacesPerUser
            );

        try {
            await this.outboxService.withTransaction(async tx => {
                const ownedCount = await this.workspaceService.countOwnedInTx(
                    tx,
                    targetMember.userId
                );
                if (ownedCount >= maxWorkspacesPerUser) {
                    throw new WorkspaceCapReachedException();
                }

                const promoted =
                    await this.workspaceMemberRepository.promoteToOwnerInTx(
                        tx,
                        workspaceId,
                        ownerMember.id,
                        targetMember.id,
                        ownerRole.id
                    );
                if (!promoted) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }

                const demoted =
                    await this.workspaceMemberRepository.demoteOwnerInTx(
                        tx,
                        workspaceId,
                        ownerMember.id,
                        ownerRole.id,
                        adminRole.id
                    );
                if (!demoted) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }

                await this.outboxService.addManyInTx(tx, entries);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }
    }

    assertRoleAssignable(role: IRoleRef): void {
        if (role.key === EnumRoleWorkspaceKey.owner) {
            throw new WorkspaceOwnerRoleNotAssignableException();
        }
    }

    async validateWorkspaceMemberGuard(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceMemberWithRole> {
        const member =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                userId
            );
        if (!member) {
            throw new WorkspaceMemberForbiddenException();
        }

        return member;
    }

    async getOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceMemberWithRole | null> {
        return this.workspaceMemberRepository.findOneByWorkspaceAndUser(
            workspaceId,
            userId
        );
    }

    async resolveLastWorkspaceId(
        userId: string,
        lastWorkspaceId: string | null
    ): Promise<string | null> {
        if (lastWorkspaceId === null) {
            return null;
        }

        const [workspace, member] = await Promise.all([
            this.workspaceRepository.findActiveById(lastWorkspaceId),
            this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                lastWorkspaceId,
                userId
            ),
        ]);
        if (!workspace || !member) {
            return null;
        }

        return lastWorkspaceId;
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string,
        actorId: string
    ): Promise<IWorkspaceMemberWithRole> {
        return this.workspaceMemberRepository.createInTx(
            tx,
            workspaceId,
            userId,
            roleId,
            actorId
        );
    }

    async getReviewerUserIds(workspaceId: string): Promise<string[]> {
        return this.workspaceMemberRepository.findReviewerUserIdsByWorkspace(
            workspaceId
        );
    }

    /** Swaps the owner and adds both activity entries in one transaction, dispatched after the commit. */
    async transferOwnership(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        actorMember: IWorkspaceMemberWithRole,
        targetUserId: string
    ): Promise<void> {
        if (targetUserId === actorMember.userId) {
            throw new WorkspaceSelfTransferException();
        }

        // Sequential by design: gate before the work it guards
        const targetMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                targetUserId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        const targetUser = await this.userService.getOneActive(targetUserId);
        if (!targetUser) {
            throw new WorkspaceTransferTargetInactiveException();
        }

        const ownerEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }
        );
        const newOwnerEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }
        );

        await this.transferOwnershipGuarded(
            workspaceId,
            actorMember,
            targetMember,
            [ownerEntry, newOwnerEntry]
        );
    }

    /** A platform admin swaps the owner of any workspace to an active member and adds the admin, previous owner, and new owner entries in one transaction, dispatched after the commit. */
    async transferOwnershipByAdmin(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        targetUserId: string
    ): Promise<void> {
        // Sequential by design: gate before the work it guards
        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        const ownerMember =
            await this.workspaceMemberRepository.findOneOwnerByWorkspace(
                workspaceId
            );
        if (!ownerMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetUserId === ownerMember.userId) {
            throw new WorkspaceSelfTransferException();
        }

        const targetMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                targetUserId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        const targetUser = await this.userService.getOneActive(targetUserId);
        if (!targetUser) {
            throw new WorkspaceTransferTargetInactiveException();
        }

        const adminEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminWorkspaceOwnershipTransfer,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId,
                metadata: {
                    workspaceId,
                    previousOwnerUserId: ownerMember.userId,
                    targetUserId,
                },
            }
        );
        const previousOwnerEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceOwnershipRemovedByAdmin,
                userId: ownerMember.userId,
                createdBy: authContext.userId,
                workspaceId,
                metadata: { actorUserId: authContext.userId, targetUserId },
            }
        );
        const newOwnerEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByAdmin,
                userId: targetUserId,
                createdBy: authContext.userId,
                workspaceId,
                metadata: { actorUserId: authContext.userId },
            }
        );

        await this.transferOwnershipGuarded(
            workspaceId,
            ownerMember,
            targetMember,
            [adminEntry, previousOwnerEntry, newOwnerEntry]
        );
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return this.workspaceMemberRepository.removeByUserInTx(tx, userId);
    }

    async leaveWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        member: IWorkspaceMemberWithRole
    ): Promise<void> {
        if (member.role.key === EnumRoleWorkspaceKey.owner) {
            throw new WorkspaceLastOwnerException();
        }

        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            member.id,
            member.roleId
        );
        if (!removed) {
            throw new WorkspaceMemberNotFoundException();
        }
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams,
        roleKey: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            roleKey,
            additionalWhere
        );
    }

    /** Swaps the role guarded by the role read and adds both activity entries in one transaction, dispatched after the commit. */
    async updateMemberRole(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        actorMember: IWorkspaceMemberWithRole,
        targetMemberId: string,
        newRoleId: string,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<void> {
        const newRole = await this.roleService.getRefByIdForScope(
            newRoleId,
            EnumRoleScope.workspace
        );
        this.assertRoleAssignable(newRole);

        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId,
                additionalWhere
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetMember.userId === actorMember.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        try {
            await this.outboxService.withTransaction(async tx => {
                const updated =
                    await this.workspaceMemberRepository.updateRoleInTx(
                        tx,
                        targetMember.id,
                        targetMember.roleId,
                        newRole.id
                    );
                if (!updated) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }

                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                        userId: actorMember.userId,
                        createdBy: actorMember.userId,
                        workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    }
                );
                const targetEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                        userId: targetMember.userId,
                        createdBy: actorMember.userId,
                        workspaceId,
                        metadata: { actorUserId: actorMember.userId },
                    }
                );
                await this.outboxService.addManyInTx(tx, [
                    actorEntry,
                    targetEntry,
                ]);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorMember: IWorkspaceMemberWithRole,
        targetMemberId: string,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IWorkspaceMemberWithRole> {
        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId,
                additionalWhere
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetMember.userId === actorMember.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            targetMember.id,
            targetMember.roleId
        );
        if (!removed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        return targetMember;
    }

    async getMembersListByAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const [workspace, paginated] = await Promise.all([
            this.workspaceRepository.findByIdByAdmin(workspaceId, null),
            this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination,
                null,
                additionalWhere
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return paginated;
    }
}
