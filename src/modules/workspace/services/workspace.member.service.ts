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
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceHeaderMissingException } from '@modules/workspace/exceptions/workspace.header-missing.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { WorkspaceTransferTargetInactiveException } from '@modules/workspace/exceptions/workspace.transfer-target-inactive.exception';
import type {
    IWorkspaceContext,
    IWorkspaceMember,
    IWorkspaceMemberWithEmail,
    IWorkspaceTransferMember,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
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
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly featureFlagService: FeatureFlagService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private isPeerActionAllowed(
        actorRole: EnumWorkspaceMemberRole,
        targetRole: EnumWorkspaceMemberRole
    ): boolean {
        if (targetRole === EnumWorkspaceMemberRole.owner) {
            return false;
        }

        return !(
            actorRole === EnumWorkspaceMemberRole.admin &&
            targetRole === EnumWorkspaceMemberRole.admin
        );
    }

    private isTransferTargetActive(target: IWorkspaceTransferMember): boolean {
        return (
            target.user.status === EnumUserStatus.active &&
            target.user.deletedAt === null
        );
    }

    private hasRole(
        member: WorkspaceMember,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): boolean {
        return (
            member.role === EnumWorkspaceMemberRole.owner ||
            allowedRoles.includes(member.role)
        );
    }

    private assertPeerActionAllowed(
        actorMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): void {
        const isAllowed = this.isPeerActionAllowed(
            actorMember.role,
            targetMember.role
        );
        if (!isAllowed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    private async transferOwnershipGuarded(
        workspaceId: string,
        ownerMember: WorkspaceMember,
        targetMember: WorkspaceMember,
        entries: IOutboxEffect[]
    ): Promise<void> {
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
                        targetMember.id
                    );
                if (!promoted) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }

                const demoted =
                    await this.workspaceMemberRepository.demoteOwnerInTx(
                        tx,
                        workspaceId,
                        ownerMember.id
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

    /** An `owner` passes without being in `allowedRoles`; with a non-empty list any other role must be in it. */
    async validateWorkspaceGuard(
        workspaceId: string | null,
        userId: string,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): Promise<IWorkspaceContext> {
        if (!workspaceId) {
            throw new WorkspaceHeaderMissingException();
        }

        const row = await this.workspaceRepository.findActiveByIdWithMember(
            workspaceId,
            userId
        );
        if (!row) {
            throw new WorkspaceNotFoundException();
        }

        const { members, ...workspace } = row;
        const workspaceMember = members[0];
        if (!workspaceMember) {
            throw new WorkspaceMemberForbiddenException();
        }

        const isRoleChecked = allowedRoles.length > 0;
        const hasRole = this.hasRole(workspaceMember, allowedRoles);
        if (isRoleChecked && !hasRole) {
            throw new WorkspaceRoleForbiddenException();
        }

        return { workspaceId, workspace, workspaceMember };
    }

    async getOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null> {
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

        const isActiveMember =
            await this.workspaceMemberRepository.existsActiveByWorkspaceAndUser(
                lastWorkspaceId,
                userId
            );

        return isActiveMember ? lastWorkspaceId : null;
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        actorId: string
    ): Promise<WorkspaceMember> {
        return this.workspaceMemberRepository.createInTx(
            tx,
            workspaceId,
            userId,
            role,
            actorId
        );
    }

    /** Swaps the owner and adds both activity entries in one transaction, dispatched after the commit. */
    async transferOwnership(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void> {
        if (targetUserId === actorMember.userId) {
            throw new WorkspaceSelfTransferException();
        }

        // Sequential by design: gate before the work it guards
        const targetMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUserWithUser(
                workspaceId,
                targetUserId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        const isTargetActive = this.isTransferTargetActive(targetMember);
        if (!isTargetActive) {
            throw new WorkspaceTransferTargetInactiveException();
        }

        const ownerEntry = this.activityLogQueue.recordEffect(
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
        const newOwnerEntry = this.activityLogQueue.recordEffect(
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
        const row =
            await this.workspaceRepository.findActiveByIdWithTransferMembers(
                workspaceId,
                targetUserId
            );
        if (!row) {
            throw new WorkspaceNotFoundException();
        }

        const ownerMember = row.members.find(
            member => member.role === EnumWorkspaceMemberRole.owner
        );
        if (!ownerMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetUserId === ownerMember.userId) {
            throw new WorkspaceSelfTransferException();
        }

        const targetMember = row.members.find(
            member => member.userId === targetUserId
        );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        const isTargetActive = this.isTransferTargetActive(targetMember);
        if (!isTargetActive) {
            throw new WorkspaceTransferTargetInactiveException();
        }

        const adminEntry = this.activityLogQueue.recordEffect(
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
        const previousOwnerEntry = this.activityLogQueue.recordEffect(
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
        const newOwnerEntry = this.activityLogQueue.recordEffect(
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
        member: WorkspaceMember
    ): Promise<void> {
        if (member.role === EnumWorkspaceMemberRole.owner) {
            throw new WorkspaceLastOwnerException();
        }

        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            member.id,
            member.role
        );
        if (!removed) {
            throw new WorkspaceMemberNotFoundException();
        }
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            role ?? null
        );
    }

    /** Swaps the role guarded by the role read and adds both activity entries in one transaction, dispatched after the commit. */
    async updateMemberRole(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void> {
        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
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
                        targetMember.role,
                        newRole
                    );
                if (!updated) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }

                const actorEntry = this.activityLogQueue.recordEffect(
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
                const targetEntry = this.activityLogQueue.recordEffect(
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
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<IWorkspaceMemberWithEmail> {
        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspaceInTx(
                tx,
                targetMemberId,
                workspaceId
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
            targetMember.role
        );
        if (!removed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        return targetMember;
    }

    async getMembersListByAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const [workspace, paginated] = await Promise.all([
            this.workspaceRepository.findByIdByAdmin(workspaceId),
            this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination,
                null
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return paginated;
    }
}
