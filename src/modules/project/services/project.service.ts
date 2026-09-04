import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    Prisma,
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import {
    ProjectWorkspaceBypassRole,
    ProjectWorkspaceOwnerStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import { IProjectService } from '@modules/project/interfaces/project.service.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectService implements IProjectService {
    private readonly slugPattern: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.slugPattern = this.configService.get<RegExp>(
            'project.slugPattern'
        )!;
        this.slugPrefix = this.configService.get<string>('project.slugPrefix')!;
        this.slugMaxLength = this.configService.get<number>(
            'project.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'project.slugMaxAttempts'
        )!;
    }

    private drawSlugCandidates(): string[] {
        return Array.from({ length: this.slugMaxAttempts }, () =>
            this.helperStringService.generateSlug(
                this.slugPrefix,
                this.slugMaxLength
            )
        );
    }

    private assertSlugAllowed(slug: string): void {
        if (slug.length > this.slugMaxLength || !this.slugPattern.test(slug)) {
            throw new ProjectSlugInvalidException();
        }
    }

    private currentRequestLog(): IRequestLog {
        return this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
    }

    private isWorkspaceOwner(workspaceMember: WorkspaceMember): boolean {
        return workspaceMember.role === ProjectWorkspaceBypassRole;
    }

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

    async validateProjectGuard(
        workspaceId: string | null,
        projectId: string | null
    ): Promise<Project> {
        if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        } else if (!projectId) {
            throw new ProjectNotFoundException();
        }

        const project = await this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId
        );
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
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

        if (this.isWorkspaceOwner(workspaceMember)) {
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

    /** Lists projects in the workspace: a workspace `owner` sees every project, everyone else sees only the ones they hold a `ProjectMember` row for. */
    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const memberUserId = this.isWorkspaceOwner(workspaceMember)
            ? null
            : workspaceMember.userId;

        const { data, ...others } =
            await this.projectRepository.findWithPaginationCursorForWorkspace(
                workspaceId,
                memberUserId,
                pagination
            );

        return {
            data: this.projectUtil.mapList(data),
            ...others,
        };
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        dto: ProjectCreateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const requestLog = this.currentRequestLog();

        if (dto.slug) {
            this.assertSlugAllowed(dto.slug);

            const slugTaken =
                await this.projectRepository.existsBySlugInWorkspace(
                    workspaceId,
                    dto.slug
                );
            if (slugTaken) {
                throw new ProjectSlugAlreadyExistsException();
            }
        }

        const project = await this.projectRepository.createWithSlug(
            workspaceId,
            actorId,
            dto,
            this.drawSlugCandidates(),
            requestLog
        );

        return { data: this.projectUtil.mapOne(project) };
    }

    getProject(project: Project): IResponseReturn<ProjectResponseDto> {
        return { data: this.projectUtil.mapOne(project) };
    }

    async updateProject(
        project: Project,
        actorId: string,
        dto: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const requestLog = this.currentRequestLog();

        const updated = await this.projectRepository.updateDetails(
            project.id,
            project.workspaceId,
            actorId,
            dto,
            requestLog
        );

        return { data: this.projectUtil.mapOne(updated) };
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        slug: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const requestLog = this.currentRequestLog();

        this.assertSlugAllowed(slug);

        const slugTaken = await this.projectRepository.existsBySlugInWorkspace(
            project.workspaceId,
            slug,
            project.id
        );
        if (slugTaken) {
            throw new ProjectSlugAlreadyExistsException();
        }

        const updated = await this.projectRepository.updateSlug(
            project.id,
            project.workspaceId,
            actorId,
            slug,
            requestLog
        );

        return { data: this.projectUtil.mapOne(updated) };
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        const requestLog = this.currentRequestLog();

        await this.projectRepository.softDelete(
            project.id,
            project.workspaceId,
            actorId,
            requestLog
        );
    }

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        const { data, ...others } =
            await this.projectMemberRepository.findWithPaginationCursor(
                project.id,
                pagination
            );

        return {
            data: this.projectUtil.mapMemberList(data),
            ...others,
        };
    }

    async assignMember(
        project: Project,
        actorId: string,
        dto: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<ProjectMemberResponseDto>> {
        const requestLog = this.currentRequestLog();

        this.assertProjectMemberPeerAllowed(
            this.currentActorIsWorkspaceOwner(),
            dto.role
        );

        const [targetIsWorkspaceMember, existing] = await Promise.all([
            this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                project.workspaceId,
                dto.userId
            ),
            this.projectMemberRepository.findOneByProjectAndUser(
                project.id,
                dto.userId
            ),
        ]);
        if (!targetIsWorkspaceMember) {
            throw new WorkspaceMemberNotFoundException();
        } else if (existing) {
            throw new ProjectMemberAlreadyAssignedException();
        }

        const member = await this.projectMemberRepository.createAssigned(
            project.id,
            project.workspaceId,
            actorId,
            dto.userId,
            dto.role,
            requestLog
        );

        return { data: this.projectUtil.mapMember(member) };
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<void> {
        const requestLog = this.currentRequestLog();

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
        const requestLog = this.currentRequestLog();

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
        const requestLog = this.currentRequestLog();

        await this.projectMemberRepository.removeMember(
            project.workspaceId,
            member.userId,
            member.id,
            EnumActivityLogAction.projectMemberLeft,
            requestLog
        );
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findWithPaginationOffsetForAdmin(
                pagination,
                workspaceId
            );

        return {
            data: this.projectUtil.mapList(data),
            ...others,
        };
    }

    async getByIdForAdmin(
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project =
            await this.projectRepository.findByIdForAdmin(projectId);
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return { data: this.projectUtil.mapOne(project) };
    }
}
