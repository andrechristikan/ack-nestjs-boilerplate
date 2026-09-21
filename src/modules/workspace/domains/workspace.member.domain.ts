import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
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
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberDomain {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private assertPeerActionAllowed(
        actorMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): void {
        if (targetMember.role === EnumWorkspaceMemberRole.owner) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        if (
            actorMember.role === EnumWorkspaceMemberRole.admin &&
            targetMember.role === EnumWorkspaceMemberRole.admin
        ) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    async validateWorkspaceMemberGuard(
        workspaceId: string | null,
        userId: string | null
    ): Promise<WorkspaceMember> {
        if (!userId) {
            throw new AuthJwtAccessTokenInvalidException();
        } else if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        }

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

    /** Enforces `allowedRoles` against the caller's membership. An `owner` satisfies every role check structurally and is therefore never listed in a route's `allowedRoles`. */
    validateWorkspaceRoleGuard(
        member: WorkspaceMember | null,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember {
        if (!member) {
            throw new WorkspaceRoleForbiddenException();
        }

        if (member.role === EnumWorkspaceMemberRole.owner) {
            return member;
        }

        if (!allowedRoles.includes(member.role)) {
            throw new WorkspaceRoleForbiddenException();
        }

        return member;
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

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void> {
        if (targetUserId === actorMember.userId) {
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

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorMember.userId) {
            const workspaceOwnershipTransferredByOwnerEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                    userId: targetMember.userId,
                    createdBy: actorMember.userId,
                    workspaceId: workspaceId,
                    metadata: { actorUserId: actorMember.userId },
                });
            events.push(workspaceOwnershipTransferredByOwnerEvent);
        }

        await this.workspaceMemberRepository.transferOwnership(
            actorMember.id,
            targetMember.id
        );

        this.activityLogDomain.stagePrepared(events);
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void> {
        if (member.role === EnumWorkspaceMemberRole.owner) {
            const ownerCount =
                await this.workspaceMemberRepository.countOwners(workspaceId);
            if (ownerCount <= 1) {
                throw new WorkspaceLastOwnerException();
            }
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberLeft,
                userId: member.userId,
                createdBy: member.userId,
                workspaceId: workspaceId,
            }),
        ];

        await this.workspaceMemberRepository.removeMember(member.id);

        this.activityLogDomain.stagePrepared(events);
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            role
        );
    }

    async updateMemberRole(
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

        this.assertPeerActionAllowed(actorMember, targetMember);

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorMember.userId) {
            const workspaceMemberRoleUpdatedByAdminEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorMember.userId,
                    workspaceId: workspaceId,
                    metadata: { actorUserId: actorMember.userId },
                });
            events.push(workspaceMemberRoleUpdatedByAdminEvent);
        }

        await this.workspaceMemberRepository.updateRole(
            targetMember.id,
            newRole
        );

        this.activityLogDomain.stagePrepared(events);
    }

    async removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
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

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorMember.userId) {
            const workspaceMemberRemovedByAdminEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorMember.userId,
                    workspaceId: workspaceId,
                    metadata: { actorUserId: actorMember.userId },
                });
            events.push(workspaceMemberRemovedByAdminEvent);
        }

        await this.workspaceMemberRepository.removeMember(targetMember.id);

        this.activityLogDomain.stagePrepared(events);
    }

    async getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const [workspace, paginated] = await Promise.all([
            this.workspaceRepository.findByIdForAdmin(workspaceId),
            this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return paginated;
    }
}
