import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole, Prisma } from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ProjectWorkspaceBypassStoreKey } from '@modules/project/constants/project.constant';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberDomain {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private currentActorHasWorkspaceBypass(): boolean {
        const hasWorkspaceBypass = this.requestStoreService.get<boolean>(
            ProjectWorkspaceBypassStoreKey
        );

        return hasWorkspaceBypass ?? false;
    }

    private assertProjectMemberPeerAllowed(
        hasWorkspaceBypass: boolean,
        ...rolesInvolved: EnumProjectMemberRole[]
    ): void {
        if (
            !hasWorkspaceBypass &&
            rolesInvolved.includes(EnumProjectMemberRole.admin)
        ) {
            throw new ProjectMemberPeerForbiddenException();
        }
    }

    async validateProjectMemberGuard(
        projectId: string,
        userId: string
    ): Promise<ProjectMember> {
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
        projectId: string,
        workspaceMember: WorkspaceMember,
        allowedProjectRoles: EnumProjectMemberRole[]
    ): Promise<boolean> {
        const hasWorkspaceBypass =
            this.projectUtil.hasWorkspaceBypass(workspaceMember);
        if (hasWorkspaceBypass) {
            return true;
        }

        const member =
            await this.projectMemberRepository.findOneByProjectAndUser(
                projectId,
                workspaceMember.userId
            );
        if (!member) {
            throw new ProjectMemberForbiddenException();
        } else if (!allowedProjectRoles.includes(member.role)) {
            throw new ProjectRoleForbiddenException();
        }

        return false;
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
        const hasWorkspaceBypass = this.currentActorHasWorkspaceBypass();
        this.assertProjectMemberPeerAllowed(hasWorkspaceBypass, role);

        if (!targetMember || targetMember.workspaceId !== project.workspaceId) {
            throw new WorkspaceMemberNotFoundException();
        }

        // Sequential by design: gate before the work it guards
        const existing =
            await this.projectMemberRepository.findOneByProjectAndUser(
                project.id,
                targetMember.userId
            );
        if (existing) {
            throw new ProjectMemberAlreadyAssignedException();
        }

        return this.projectMemberRepository.create(
            project.id,
            targetMember.userId,
            role,
            actorId
        );
    }

    async updateMemberRole(
        project: Project,
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

        const hasWorkspaceBypass = this.currentActorHasWorkspaceBypass();
        this.assertProjectMemberPeerAllowed(
            hasWorkspaceBypass,
            targetMember.role,
            newRole
        );

        await this.projectMemberRepository.updateRole(targetMember.id, newRole);

        return targetMember;
    }

    async removeMember(
        project: Project,
        actorId: string,
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

        if (targetMember.userId === actorId) {
            throw new ProjectMemberPeerForbiddenException();
        }

        const hasWorkspaceBypass = this.currentActorHasWorkspaceBypass();
        this.assertProjectMemberPeerAllowed(
            hasWorkspaceBypass,
            targetMember.role
        );

        await this.projectMemberRepository.removeMember(targetMember.id);

        return targetMember;
    }

    async leaveProject(member: ProjectMember): Promise<void> {
        await this.projectMemberRepository.removeMember(member.id);
    }
}
