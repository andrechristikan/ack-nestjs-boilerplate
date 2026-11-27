import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
} from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import type {
    IProjectContext,
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { Injectable } from '@nestjs/common';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly projectRepository: ProjectRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue
    ) {}

    private assertPeerAllowed(
        { hasWorkspaceBypass }: IProjectMemberActor,
        ...rolesInvolved: EnumProjectMemberRole[]
    ): void {
        if (
            !hasWorkspaceBypass &&
            rolesInvolved.includes(EnumProjectMemberRole.admin)
        ) {
            throw new ProjectMemberPeerForbiddenException();
        }
    }

    async validateProjectGuard(
        workspaceMember: WorkspaceMember,
        projectId: string | null,
        allowedRoles: EnumProjectMemberRole[]
    ): Promise<IProjectContext> {
        if (!projectId) {
            throw new RequestContextMissingException('params.projectId');
        }

        const row =
            await this.projectRepository.findActiveByIdAndWorkspaceWithMember(
                projectId,
                workspaceMember.workspaceId,
                workspaceMember.userId
            );
        if (!row) {
            throw new ProjectNotFoundException();
        }

        const { members, ...project } = row;
        const projectMember = members[0] ?? null;
        const isRoleChecked = allowedRoles.length > 0;
        const isWorkspaceBypass =
            this.projectUtil.hasWorkspaceBypass(workspaceMember);
        const hasWorkspaceBypass = isRoleChecked && isWorkspaceBypass;
        if (hasWorkspaceBypass) {
            return { project, projectMember };
        }

        if (projectMember === null) {
            throw new ProjectMemberForbiddenException();
        } else if (
            isRoleChecked &&
            !allowedRoles.includes(projectMember.role)
        ) {
            throw new ProjectRoleForbiddenException();
        }

        return { project, projectMember };
    }

    assertMember(member: ProjectMember | null): ProjectMember {
        if (member === null) {
            throw new ProjectMemberNotFoundException();
        }

        return member;
    }

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams
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
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<void> {
        return this.projectMemberRepository.createInTx(
            tx,
            projectId,
            userId,
            role,
            createdBy
        );
    }

    async removeByWorkspaceAndUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        return this.projectMemberRepository.removeByWorkspaceAndUserInTx(
            tx,
            workspaceId,
            userId
        );
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return this.projectMemberRepository.removeByUserInTx(tx, userId);
    }

    assertAssignable(
        project: Project,
        actor: IProjectMemberActor,
        targetMember: WorkspaceMember | null,
        role: EnumProjectMemberRole
    ): WorkspaceMember {
        this.assertPeerAllowed(actor, role);

        if (!targetMember || targetMember.workspaceId !== project.workspaceId) {
            throw new WorkspaceMemberNotFoundException();
        }

        return targetMember;
    }

    async getRoleUpdatableMember(
        project: Project,
        actor: IProjectMemberActor,
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<ProjectMember> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        this.assertPeerAllowed(actor, targetMember.role, newRole);

        return targetMember;
    }

    async getRemovableMember(
        authContext: IAuthJwtAccessContext,
        project: Project,
        actor: IProjectMemberActor,
        targetMemberId: string
    ): Promise<ProjectMember> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        if (targetMember.userId === authContext.userId) {
            throw new ProjectMemberPeerForbiddenException();
        }

        this.assertPeerAllowed(actor, targetMember.role);

        return targetMember;
    }

    async assignMemberInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        targetMember: WorkspaceMember,
        role: EnumProjectMemberRole
    ): Promise<IProjectMember> {
        const member = await this.projectMemberRepository.createWithUserInTx(
            tx,
            project.id,
            targetMember.userId,
            role,
            authContext.userId
        );
        const actorEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }
        );
        const entries = [actorEntry];
        if (targetMember.userId !== authContext.userId) {
            const assigneeEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                    userId: targetMember.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: authContext.userId },
                }
            );
            entries.push(assigneeEntry);
        }
        await this.outboxService.addManyInTx(tx, entries);

        return member;
    }

    async updateMemberRoleInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        targetMember: ProjectMember,
        newRole: EnumProjectMemberRole
    ): Promise<void> {
        const updated = await this.projectMemberRepository.updateRoleInTx(
            tx,
            targetMember.id,
            targetMember.role,
            newRole
        );

        const actorEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: updated.userId },
            }
        );
        const entries = [actorEntry];
        if (updated.userId !== authContext.userId) {
            const targetEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: updated.userId,
                    createdBy: authContext.userId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: authContext.userId },
                }
            );
            entries.push(targetEntry);
        }
        await this.outboxService.addManyInTx(tx, entries);
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        targetMember: ProjectMember
    ): Promise<void> {
        const removed = await this.projectMemberRepository.removeMemberInTx(
            tx,
            targetMember.id,
            targetMember.role
        );

        const actorEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: removed.userId },
            }
        );
        const targetEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                userId: removed.userId,
                createdBy: authContext.userId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: authContext.userId },
            }
        );
        await this.outboxService.addManyInTx(tx, [actorEntry, targetEntry]);
    }

    async leaveProjectInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        member: ProjectMember
    ): Promise<void> {
        const removed = await this.projectMemberRepository.removeByIdInTx(
            tx,
            member.id
        );

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectMemberLeft,
                userId: removed.userId,
                createdBy: removed.userId,
                workspaceId: project.workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }
}
