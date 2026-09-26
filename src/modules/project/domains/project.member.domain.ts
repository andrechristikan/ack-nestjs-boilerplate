import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberLastAdminException } from '@modules/project/exceptions/project.member-last-admin.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import type {
    IProjectMember,
    IProjectMemberWithRole,
    IProjectMemberWithRolePolicies,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberDomain {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly policyDomain: PolicyDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly roleDomain: RoleDomain
    ) {}

    private assertProjectMemberPeerAllowed(
        ...roleKeysInvolved: string[]
    ): void {
        const canManageMembers = this.policyDomain.can(
            EnumPolicyAction.manage,
            EnumPolicySubject.projectMember
        );
        if (
            !canManageMembers &&
            roleKeysInvolved.includes(EnumRoleProjectKey.admin)
        ) {
            throw new ProjectMemberPeerForbiddenException();
        }
    }

    private async assertNotLastAdmin(projectId: string): Promise<void> {
        const adminCount =
            await this.projectMemberRepository.countAdmins(projectId);
        if (adminCount <= 1) {
            throw new ProjectMemberLastAdminException();
        }
    }

    async validateProjectMemberGuard(
        projectId: string | null,
        userId: string | null,
        required: boolean
    ): Promise<IProjectMemberWithRolePolicies | null> {
        if (!userId) {
            throw new AuthJwtAccessTokenInvalidException();
        } else if (!projectId) {
            throw new ProjectNotFoundException();
        }

        const member =
            await this.projectMemberRepository.findOneWithRoleByProjectAndUser(
                projectId,
                userId
            );
        if (!member) {
            if (required) {
                throw new ProjectMemberForbiddenException();
            }

            return null;
        }

        this.roleDomain.assertScope(member.role, EnumRoleScope.project);

        return member;
    }

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.projectMemberRepository.findWithPaginationCursor(
            project.id,
            pagination
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<IProjectMember> {
        return this.projectMemberRepository.createInTx(
            tx,
            projectId,
            userId,
            roleId,
            createdBy
        );
    }

    async assignMember(
        project: Project,
        actorId: string,
        targetMember: WorkspaceMember | null,
        roleId: string
    ): Promise<IProjectMember> {
        const role = await this.roleDomain.resolve(
            roleId,
            EnumRoleScope.project
        );
        this.assertProjectMemberPeerAllowed(role.key);

        if (!targetMember || targetMember.workspaceId !== project.workspaceId) {
            throw new WorkspaceMemberNotFoundException();
        }

        const existing =
            await this.projectMemberRepository.findOneByProjectAndUser(
                project.id,
                targetMember.userId
            );
        if (existing) {
            throw new ProjectMemberAlreadyAssignedException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorId) {
            const assignedByAdminEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                userId: targetMember.userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            });
            events.push(assignedByAdminEvent);
        }

        const member = await this.projectMemberRepository.create(
            project.id,
            targetMember.userId,
            role.id,
            actorId
        );

        this.activityLogDomain.stagePrepared(events);

        return member;
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        roleId: string
    ): Promise<void> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        const role = await this.roleDomain.resolve(
            roleId,
            EnumRoleScope.project
        );
        this.assertProjectMemberPeerAllowed(targetMember.role.key, role.key);
        if (
            targetMember.role.key === EnumRoleProjectKey.admin &&
            role.key !== EnumRoleProjectKey.admin
        ) {
            await this.assertNotLastAdmin(project.id);
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorId) {
            const roleUpdatedByAdminEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                userId: targetMember.userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            });
            events.push(roleUpdatedByAdminEvent);
        }

        await this.projectMemberRepository.updateRole(targetMember.id, role.id);

        this.activityLogDomain.stagePrepared(events);
    }

    async removeMember(
        project: Project,
        actorId: string,
        targetMemberId: string
    ): Promise<void> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        if (targetMember.userId === actorId) {
            throw new ProjectMemberPeerForbiddenException();
        }

        this.assertProjectMemberPeerAllowed(targetMember.role.key);
        if (targetMember.role.key === EnumRoleProjectKey.admin) {
            await this.assertNotLastAdmin(project.id);
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorId) {
            const removedByAdminEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                userId: targetMember.userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            });
            events.push(removedByAdminEvent);
        }

        await this.projectMemberRepository.removeMember(targetMember.id);

        this.activityLogDomain.stagePrepared(events);
    }

    async leaveProject(
        project: Project,
        member: IProjectMemberWithRole
    ): Promise<void> {
        if (member.role.key === EnumRoleProjectKey.admin) {
            await this.assertNotLastAdmin(project.id);
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: member.userId,
                createdBy: member.userId,
                workspaceId: project.workspaceId,
            }),
        ];

        await this.projectMemberRepository.removeMember(member.id);

        this.activityLogDomain.stagePrepared(events);
    }
}
