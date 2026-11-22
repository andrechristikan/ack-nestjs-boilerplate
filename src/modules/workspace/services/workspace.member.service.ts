import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
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
import { OutboxService } from '@common/outbox/services/outbox.service';
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
    IWorkspaceTransfer,
    IWorkspaceTransferMember,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Injectable } from '@nestjs/common';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceMemberService {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue
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

    private async swapOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        ownerMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): Promise<void> {
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

        const demoted = await this.workspaceMemberRepository.demoteOwnerInTx(
            tx,
            workspaceId,
            ownerMember.id
        );
        if (!demoted) {
            throw new WorkspaceMemberPeerForbiddenException();
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

    async getTransferTarget(
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        targetUserId: string
    ): Promise<WorkspaceMember> {
        if (targetUserId === authContext.userId) {
            throw new WorkspaceSelfTransferException();
        }

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

        return targetMember;
    }

    async getTransferByAdmin(
        workspaceId: string,
        targetUserId: string
    ): Promise<IWorkspaceTransfer> {
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

        return { ownerMember, targetMember };
    }

    async transferOwnershipInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): Promise<void> {
        await this.swapOwnerInTx(tx, workspaceId, actorMember, targetMember);

        const ownerEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: authContext.userId,
                createdBy: authContext.userId,
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
                createdBy: authContext.userId,
                workspaceId,
                metadata: { actorUserId: authContext.userId },
            }
        );
        await this.outboxService.addManyInTx(tx, [ownerEntry, newOwnerEntry]);
    }

    async transferOwnershipByAdminInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        { ownerMember, targetMember }: IWorkspaceTransfer
    ): Promise<void> {
        await this.swapOwnerInTx(tx, workspaceId, ownerMember, targetMember);

        const adminEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminWorkspaceOwnershipTransferred,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId,
                metadata: {
                    workspaceId,
                    previousOwnerUserId: ownerMember.userId,
                    targetUserId: targetMember.userId,
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
                metadata: {
                    actorUserId: authContext.userId,
                    targetUserId: targetMember.userId,
                },
            }
        );
        const newOwnerEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceOwnershipTransferredByAdmin,
                userId: targetMember.userId,
                createdBy: authContext.userId,
                workspaceId,
                metadata: { actorUserId: authContext.userId },
            }
        );
        await this.outboxService.addManyInTx(tx, [
            adminEntry,
            previousOwnerEntry,
            newOwnerEntry,
        ]);
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return this.workspaceMemberRepository.removeByUserInTx(tx, userId);
    }

    assertLeavable(member: WorkspaceMember): void {
        if (member.role === EnumWorkspaceMemberRole.owner) {
            throw new WorkspaceLastOwnerException();
        }
    }

    /** Removes the member and cancels that user's pending join request to the workspace; throws and cancels nothing when the guarded removal misses. */
    async leaveWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        member: WorkspaceMember
    ): Promise<void> {
        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            member.id,
            member.role
        );
        if (!removed) {
            throw new WorkspaceMemberNotFoundException();
        }

        await this.workspaceJoinRequestRepository.cancelPendingByUserInTx(
            tx,
            member.workspaceId,
            member.userId
        );
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

    async updateMemberRoleInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        targetMember: WorkspaceMember,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void> {
        const updated = await this.workspaceMemberRepository.updateRoleInTx(
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
                userId: authContext.userId,
                createdBy: authContext.userId,
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
                createdBy: authContext.userId,
                workspaceId,
                metadata: { actorUserId: authContext.userId },
            }
        );
        await this.outboxService.addManyInTx(tx, [actorEntry, targetEntry]);
    }

    async getPeerTarget(
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<IWorkspaceMemberWithEmail> {
        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetMember.userId === authContext.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        return targetMember;
    }

    /** Removes the target member and cancels that user's pending join request to the workspace; throws and cancels nothing when the guarded removal misses. */
    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMember: WorkspaceMember
    ): Promise<void> {
        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            targetMember.id,
            targetMember.role
        );
        if (!removed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        await this.workspaceJoinRequestRepository.cancelPendingByUserInTx(
            tx,
            targetMember.workspaceId,
            targetMember.userId
        );
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
