import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceOwnerRoleNotAssignableException } from '@modules/workspace/exceptions/workspace.owner-role-not-assignable.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
    IWorkspaceMemberWithRolePolicies,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberDomain {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly roleDomain: RoleDomain
    ) {}

    private assertPeerActionAllowed(
        actorMember: IWorkspaceMemberWithRole,
        targetMember: IWorkspaceMemberWithRole
    ): void {
        if (targetMember.role.key === EnumRoleWorkspaceKey.owner) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        if (
            actorMember.role.key === EnumRoleWorkspaceKey.admin &&
            targetMember.role.key === EnumRoleWorkspaceKey.admin
        ) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    private async resolveRoleByKey(key: EnumRoleWorkspaceKey): Promise<string> {
        const role = await this.roleDomain.getByScopeAndKey(
            EnumRoleScope.workspace,
            key
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role.id;
    }

    async validateWorkspaceMemberGuard(
        workspaceId: string | null,
        userId: string | null
    ): Promise<IWorkspaceMemberWithRolePolicies> {
        if (!userId) {
            throw new AuthJwtAccessTokenInvalidException();
        } else if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        }

        const member =
            await this.workspaceMemberRepository.findOneWithRoleByWorkspaceAndUser(
                workspaceId,
                userId
            );
        if (!member) {
            throw new WorkspaceMemberForbiddenException();
        }

        this.roleDomain.assertScope(member.role, EnumRoleScope.workspace);

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
        roleId: string,
        actorId: string
    ): Promise<WorkspaceMember> {
        return this.workspaceMemberRepository.createInTx(
            tx,
            workspaceId,
            userId,
            roleId,
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

        const [ownerRoleId, adminRoleId] = await Promise.all([
            this.resolveRoleByKey(EnumRoleWorkspaceKey.owner),
            this.resolveRoleByKey(EnumRoleWorkspaceKey.admin),
        ]);

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
            targetMember.id,
            ownerRoleId,
            adminRoleId
        );

        this.activityLogDomain.stagePrepared(events);
    }

    async leaveWorkspace(
        workspaceId: string,
        member: IWorkspaceMemberWithRole
    ): Promise<void> {
        if (member.role.key === EnumRoleWorkspaceKey.owner) {
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
        actorMember: IWorkspaceMemberWithRole,
        targetMemberId: string,
        roleId: string
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

        const role = await this.roleDomain.resolve(
            roleId,
            EnumRoleScope.workspace
        );
        if (role.key === EnumRoleWorkspaceKey.owner) {
            throw new WorkspaceOwnerRoleNotAssignableException();
        }

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
            role.id
        );

        this.activityLogDomain.stagePrepared(events);
    }

    async removeMember(
        workspaceId: string,
        actorMember: IWorkspaceMemberWithRole,
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
