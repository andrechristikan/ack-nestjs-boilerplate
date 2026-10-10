import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import { ProjectMemberListRequestSchema } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectUserListRequestSchema } from '@modules/project/dtos/request/project.user-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

import type {
    Project,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';

import { ProjectCreateRequestSchema } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberAssignRequestSchema } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectMemberUpdateRoleRequestSchema } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectUpdateSlugRequestSchema } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestSchema } from '@modules/project/dtos/request/project.update.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseSchema } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectPermissionResponseSchema } from '@modules/project/dtos/response/project.permission.response.dto';
import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';
import type { IEffectivePermission } from '@modules/policy/interfaces/policy.interface';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import {
    ProjectCurrent,
    ProjectMemberCurrent,
    ProjectMemberProtected,
    ProjectPolicyProtected,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';

import { ProjectMemberHttpService } from '@modules/project/services/project.member.http.service';
import { ProjectHttpService } from '@modules/project/services/project.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceCurrent,
    WorkspaceMemberCurrent,
    WorkspaceMemberProtected,
    WorkspacePolicyProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.user.project')
@Controller({
    version: '1',
    path: '/project',
})
export class ProjectUserController {
    constructor(
        private readonly projectHttpService: ProjectHttpService,
        private readonly projectMemberHttpService: ProjectMemberHttpService
    ) {}

    @Doc({
        summary:
            'list the projects in the current workspace that the Project read policy of the caller allows; a workspace member sees the projects they are assigned to',
    })
    @ResponsePagination('project.list', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: ProjectUserListRequestSchema })
        query: ProjectUserListRequestDto,
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectHttpService.getListForMember(workspace.id, query);
    }

    @Doc({ summary: 'create a project in the current workspace' })
    @Response('project.create', { schema: ProjectResponseSchema })
    @TermPolicyAcceptanceProtected()
    @WorkspacePolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.create],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body({ schema: ProjectCreateRequestSchema })
        body: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        return this.projectHttpService.createProject(
            workspace.id,
            workspaceMember.userId,
            body
        );
    }

    @Doc({ summary: 'get a project by id; requires the project read policy' })
    @Response('project.get', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.read],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:projectId')
    async get(
        @ProjectCurrent() project: Project
    ): Promise<IResponseReturn<Project>> {
        return this.projectHttpService.getProject(project);
    }

    @Doc({
        summary:
            "get the caller's effective permissions for the current project",
    })
    @Response('project.permissions', {
        schema: ProjectPermissionResponseSchema,
    })
    @PolicyAbilityProtected()
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:projectId/permissions')
    async permissions(
        @ProjectCurrent() project: Project
    ): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
        return this.projectHttpService.getEffectivePermissions(project);
    }

    @Doc({
        summary:
            'update a project name/description; requires the project update policy',
    })
    @Response('project.update', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.update],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:projectId')
    async update(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body({ schema: ProjectUpdateRequestSchema })
        body: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        return this.projectHttpService.updateProject(
            project,
            workspaceMember.userId,
            body
        );
    }

    @Doc({
        summary: 'update a project slug; requires the project update policy',
    })
    @Response('project.updateSlug', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.update],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/:projectId/slug')
    async updateSlug(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body({ schema: ProjectUpdateSlugRequestSchema })
        body: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<Project>> {
        return this.projectHttpService.updateProjectSlug(
            project,
            workspaceMember.userId,
            body
        );
    }

    @Doc({
        summary: 'soft-delete a project; requires the project delete policy',
    })
    @Response('project.softDelete')
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.delete],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/delete/:projectId')
    async softDelete(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember
    ): Promise<void> {
        await this.projectHttpService.softDeleteProject(
            project,
            workspaceMember.userId
        );
    }

    @Doc({
        summary:
            'list members of a project; requires the project member read policy',
    })
    @ResponsePagination('project.member.list', {
        schema: ProjectMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.read],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/member/:projectId/list')
    async memberList(
        @Query({ schema: ProjectMemberListRequestSchema })
        query: ProjectMemberListRequestDto,
        @ProjectCurrent() project: Project
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.projectMemberHttpService.getMembersList(project, query);
    }

    @Doc({
        summary:
            'assign a workspace member to a project with a project role; assigning the admin role requires the project member manage policy',
    })
    @Response('project.member.assign', { schema: ProjectMemberResponseSchema })
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.create],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/member/:projectId/assign')
    async memberAssign(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body({ schema: ProjectMemberAssignRequestSchema })
        body: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        return this.projectMemberHttpService.assignMember(
            project,
            workspaceMember.userId,
            body
        );
    }

    @Doc({
        summary:
            'update a project member role; setting or touching the admin role requires the project member manage policy',
    })
    @Response('project.member.updateRole')
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.update],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/member/:projectId/:projectMemberId/role/update')
    async memberUpdateRole(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Param('projectMemberId', { schema: RequestUuidSchema })
        projectMemberId: string,
        @Body({ schema: ProjectMemberUpdateRoleRequestSchema })
        body: ProjectMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.projectMemberHttpService.updateMemberRole(
            project,
            workspaceMember.userId,
            projectMemberId,
            body
        );
    }

    @Doc({
        summary:
            'remove a project member; removing an admin requires the project member manage policy, and removing oneself goes through leave',
    })
    @Response('project.member.remove')
    @TermPolicyAcceptanceProtected()
    @ProjectPolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.delete],
    })
    @ProjectMemberProtected({ required: false })
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/member/:projectId/:projectMemberId/remove')
    async memberRemove(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Param('projectMemberId', { schema: RequestUuidSchema })
        projectMemberId: string
    ): Promise<void> {
        await this.projectMemberHttpService.removeMember(
            project,
            workspaceMember.userId,
            projectMemberId
        );
    }

    @Doc({
        summary:
            'leave a project; requires a project membership, any project role may leave',
    })
    @Response('project.member.leave')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/member/:projectId/leave')
    async memberLeave(
        @ProjectCurrent() project: Project,
        @ProjectMemberCurrent() projectMember: IProjectMemberWithRole
    ): Promise<void> {
        await this.projectMemberHttpService.leaveProject(
            project,
            projectMember
        );
    }
}
