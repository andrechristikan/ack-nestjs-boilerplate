import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    Prisma,
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { ProjectWorkspaceOwnerStoreKey } from '@modules/project/constants/project.constant';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberDomain {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private currentActorIsWorkspaceOwner(): boolean {
        return (
            this.requestStoreService.get<boolean>(
                ProjectWorkspaceOwnerStoreKey
            ) ?? false
        );
    }

    private assertProjectMemberPeerAllowed(
        isWorkspaceOwner: boolean,
        ...rolesInvolved: EnumProjectMemberRole[]
    ): void {
        if (
            !isWorkspaceOwner &&
            rolesInvolved.includes(EnumProjectMemberRole.admin)
        ) {
            throw new ProjectMemberPeerForbiddenException();
        }
    }

    async validateProjectMemberGuard(
        projectId: string | null,
        userId: string | null
    ): Promise<ProjectMember> {
        if (!userId) {
            throw new AuthJwtAccessTokenInvalidException();
        } else if (!projectId) {
            throw new ProjectNotFoundException();
        }

        const member =
            await this.projectMemberRepository.findOneByProjectAndUser(
                projectId,
                userId
            );
        if (!member) {
            throw new ProjectMemberForbiddenException();
        }

        return member;
    }

    async validateProjectRoleGuard(
        projectId: string | null,
        workspaceMember: WorkspaceMember | null,
        allowedProjectRoles: EnumProjectMemberRole[]
    ): Promise<boolean> {
        if (!projectId) {
            throw new ProjectNotFoundException();
        } else if (!workspaceMember) {
            throw new ProjectRoleForbiddenException();
        }

        if (this.projectUtil.isWorkspaceOwner(workspaceMember)) {
            return true;
        }

        const member =
            await this.projectMemberRepository.findOneByProjectAndUser(
                projectId,
                workspaceMember.userId
            );
        if (!member || !allowedProjectRoles.includes(member.role)) {
            throw new ProjectRoleForbiddenException();
        }

        return false;
    }

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>> {
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
    ): Promise<IProjectMember> {
        return this.projectMemberRepository.createInTx(
            tx,
            projectId,
            userId,
            role,
            createdBy
        );
    }

    async assignMember(
        project: Project,
        actorId: string,
        targetMember: WorkspaceMember | null,
        role: EnumProjectMemberRole
    ): Promise<IProjectMember> {
        this.assertProjectMemberPeerAllowed(
            this.currentActorIsWorkspaceOwner(),
            role
        );

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

        return this.databaseService.withTransaction(async tx => {
            const member = await this.projectMemberRepository.createInTx(
                tx,
                project.id,
                targetMember.userId,
                role,
                actorId
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: actorId,
                workspaceId: project.workspaceId,
            });

            return member;
        });
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<void> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        this.assertProjectMemberPeerAllowed(
            this.currentActorIsWorkspaceOwner(),
            targetMember.role,
            newRole
        );

        await this.databaseService.withTransaction(async tx => {
            await this.projectMemberRepository.updateRoleInTx(
                tx,
                targetMember.id,
                newRole,
                actorId
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: actorId,
                workspaceId: project.workspaceId,
            });
        });
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

        this.assertProjectMemberPeerAllowed(
            this.currentActorIsWorkspaceOwner(),
            targetMember.role
        );

        await this.databaseService.withTransaction(async tx => {
            await this.projectMemberRepository.removeMemberInTx(
                tx,
                targetMember.id
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: actorId,
                workspaceId: project.workspaceId,
            });
        });
    }

    async leaveProject(project: Project, member: ProjectMember): Promise<void> {
        await this.databaseService.withTransaction(async tx => {
            await this.projectMemberRepository.removeMemberInTx(tx, member.id);
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: member.userId,
                workspaceId: project.workspaceId,
            });
        });
    }
}
