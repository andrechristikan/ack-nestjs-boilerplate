import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
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
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { ProjectWorkspaceOwnerStoreKey } from '@modules/project/constants/project.constant';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { IProjectMemberService } from '@modules/project/interfaces/project.member.service.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberService implements IProjectMemberService {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectUtil: ProjectUtil,
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

    async assignMember(
        project: Project,
        actorId: string,
        userId: string,
        role: EnumProjectMemberRole
    ): Promise<IProjectMember> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        this.assertProjectMemberPeerAllowed(
            this.currentActorIsWorkspaceOwner(),
            role
        );

        const [targetIsWorkspaceMember, existing] = await Promise.all([
            this.workspaceMemberService.getOneByWorkspaceAndUser(
                project.workspaceId,
                userId
            ),
            this.projectMemberRepository.findOneByProjectAndUser(
                project.id,
                userId
            ),
        ]);
        if (!targetIsWorkspaceMember) {
            throw new WorkspaceMemberNotFoundException();
        } else if (existing) {
            throw new ProjectMemberAlreadyAssignedException();
        }

        return this.projectMemberRepository.createAssigned(
            project.id,
            project.workspaceId,
            actorId,
            userId,
            role,
            requestLog
        );
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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

        await this.projectMemberRepository.updateRole(
            project.workspaceId,
            actorId,
            targetMember.id,
            newRole,
            requestLog
        );
    }

    async removeMember(
        project: Project,
        actorId: string,
        targetMemberId: string
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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

        await this.projectMemberRepository.removeMember(
            project.workspaceId,
            actorId,
            targetMember.id,
            EnumActivityLogAction.projectMemberRemoved,
            requestLog
        );
    }

    async leaveProject(project: Project, member: ProjectMember): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        await this.projectMemberRepository.removeMember(
            project.workspaceId,
            member.userId,
            member.id,
            EnumActivityLogAction.projectMemberLeft,
            requestLog
        );
    }
}
