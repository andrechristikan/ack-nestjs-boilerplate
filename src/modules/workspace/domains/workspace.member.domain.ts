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
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
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
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseUtil: DatabaseUtil
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

    private async transferOwnershipGuarded(
        workspaceId: string,
        fromMemberId: string,
        toMemberId: string
    ): Promise<void> {
        try {
            const transferred =
                await this.workspaceMemberRepository.transferOwnership(
                    workspaceId,
                    fromMemberId,
                    toMemberId
                );
            if (!transferred) {
                throw new WorkspaceMemberPeerForbiddenException();
            }
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

    async validateWorkspaceMemberGuard(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember> {
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
        member: WorkspaceMember,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember {
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

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        const workspaceOwnershipTransferredByOwnerActivityLog =
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { actorUserId: actorMember.userId },
            });
        activityLogs.push(workspaceOwnershipTransferredByOwnerActivityLog);

        await this.transferOwnershipGuarded(
            workspaceId,
            actorMember.id,
            targetMember.id
        );

        this.activityLogDomain.stagePrepared(activityLogs);
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void> {
        if (member.role === EnumWorkspaceMemberRole.owner) {
            // Sequential by design: gate before the work it guards
            const ownerCount =
                await this.workspaceMemberRepository.countOwners(workspaceId);
            if (ownerCount <= 1) {
                throw new WorkspaceLastOwnerException();
            }
        }

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberLeft,
                userId: member.userId,
                createdBy: member.userId,
                workspaceId: workspaceId,
            }),
        ];

        const removed = await this.workspaceMemberRepository.removeMember(
            member.id,
            member.role
        );
        if (!removed) {
            throw new WorkspaceMemberNotFoundException();
        }

        this.activityLogDomain.stagePrepared(activityLogs);
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            role ?? null
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

        if (targetMember.userId === actorMember.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];

        const updated = await this.workspaceMemberRepository.updateRole(
            targetMember.id,
            targetMember.role,
            newRole
        );
        if (!updated) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.activityLogDomain.stagePrepared(activityLogs);
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

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId: workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];

        const removed = await this.workspaceMemberRepository.removeMember(
            targetMember.id,
            targetMember.role
        );
        if (!removed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.activityLogDomain.stagePrepared(activityLogs);
    }

    async getMembersListByAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
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
