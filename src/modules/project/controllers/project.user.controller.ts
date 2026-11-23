import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import { ProjectMemberListRequestSchema } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectUserListRequestSchema } from '@modules/project/dtos/request/project.user-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
import type { Project } from '@generated/prisma-client/client';
import { ProjectGetPermissionsUseCase } from '@modules/project/use-cases/project.get-permissions.use-case';
import { ProjectPermissionResponseSchema } from '@modules/project/dtos/response/project.permission.response.dto';
import type { ProjectPermissionResponseDto } from '@modules/project/dtos/response/project.permission.response.dto';
import {
    PolicyAbilityProtected,
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
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
import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';
import type {
    IProjectContext,
    IProjectMember,
} from '@modules/project/interfaces/project.interface';
import {
    ProjectContext,
    ProjectMemberProtected,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';
import { ProjectGetListCursorByMemberUseCase } from '@modules/project/use-cases/project.get-list-cursor-by-member.use-case';
import { ProjectCreateUseCase } from '@modules/project/use-cases/project.create.use-case';
import { ProjectGetUseCase } from '@modules/project/use-cases/project.get.use-case';
import { ProjectUpdateUseCase } from '@modules/project/use-cases/project.update.use-case';
import { ProjectUpdateSlugUseCase } from '@modules/project/use-cases/project.update-slug.use-case';
import { ProjectSoftDeleteUseCase } from '@modules/project/use-cases/project.soft-delete.use-case';
import { ProjectGetMembersListUseCase } from '@modules/project/use-cases/project.get-members-list.use-case';
import { ProjectAssignMemberUseCase } from '@modules/project/use-cases/project.assign-member.use-case';
import { ProjectUpdateMemberRoleUseCase } from '@modules/project/use-cases/project.update-member-role.use-case';
import { ProjectRemoveMemberUseCase } from '@modules/project/use-cases/project.remove-member.use-case';
import { ProjectLeaveUseCase } from '@modules/project/use-cases/project.leave.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceContext,
    WorkspaceMemberProtected,
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
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@ApiTags('modules.user.project')
@Controller({
    version: '1',
    path: '/project',
})
export class ProjectUserController {
    constructor(
        private readonly projectGetListCursorByMemberUseCase: ProjectGetListCursorByMemberUseCase,
        private readonly projectCreateUseCase: ProjectCreateUseCase,
        private readonly projectGetPermissionsUseCase: ProjectGetPermissionsUseCase,
        private readonly projectGetUseCase: ProjectGetUseCase,
        private readonly projectUpdateUseCase: ProjectUpdateUseCase,
        private readonly projectUpdateSlugUseCase: ProjectUpdateSlugUseCase,
        private readonly projectSoftDeleteUseCase: ProjectSoftDeleteUseCase,
        private readonly projectGetMembersListUseCase: ProjectGetMembersListUseCase,
        private readonly projectAssignMemberUseCase: ProjectAssignMemberUseCase,
        private readonly projectUpdateMemberRoleUseCase: ProjectUpdateMemberRoleUseCase,
        private readonly projectRemoveMemberUseCase: ProjectRemoveMemberUseCase,
        private readonly projectLeaveUseCase: ProjectLeaveUseCase
    ) {}

    @Doc({
        summary:
            'list projects in the current workspace; workspace owner/admin see all, others only assigned projects',
    })
    @ResponsePagination('project.list', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: ProjectUserListRequestSchema })
        query: ProjectUserListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectGetListCursorByMemberUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }

    @Doc({ summary: 'create a project in the current workspace' })
    @Response('project.create', { schema: ProjectResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.create],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: ProjectCreateRequestSchema })
        body: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        return this.projectCreateUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            policyContext,
            body
        );
    }

    @Doc({ summary: 'get a project by id, subject to visibility' })
    @Response('project.get', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.read],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:projectId')
    async get(
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<Project>> {
        return this.projectGetUseCase.execute(projectContext, policyContext);
    }

    @Doc({
        summary:
            'update a project name/description; workspace owner/admin or project admin',
    })
    @Response('project.update', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.update],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:projectId')
    async update(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: ProjectUpdateRequestSchema })
        body: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        return this.projectUpdateUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            projectContext,
            policyContext,
            body
        );
    }

    @Doc({
        summary:
            'update a project slug; workspace owner/admin or project admin',
    })
    @Response('project.updateSlug', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.update],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:projectId/slug')
    async updateSlug(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: ProjectUpdateSlugRequestSchema })
        body: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<Project>> {
        return this.projectUpdateSlugUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            projectContext,
            policyContext,
            body
        );
    }

    @Doc({ summary: 'soft-delete a project' })
    @Response('project.softDelete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.delete],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:projectId')
    async softDelete(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<void>> {
        return this.projectSoftDeleteUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            projectContext,
            policyContext
        );
    }

    @Doc({ summary: 'list members of a project, subject to visibility' })
    @ResponsePagination('project.member.list', {
        schema: ProjectMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.read],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/member/:projectId/list')
    async memberList(
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: ProjectMemberListRequestSchema })
        query: ProjectMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.projectGetMembersListUseCase.execute(
            projectContext,
            policyContext,
            query
        );
    }

    @Doc({
        summary:
            'assign a workspace member to a project; assigning admin requires workspace owner/admin',
    })
    @Response('project.member.assign', { schema: ProjectMemberResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.create],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/member/:projectId/assign')
    async memberAssign(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: ProjectMemberAssignRequestSchema })
        body: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        return this.projectAssignMemberUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            projectContext,
            policyContext,
            body
        );
    }

    @Doc({
        summary:
            'update a project member role; setting/touching admin requires workspace owner/admin',
    })
    @Response('project.member.updateRole')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.update],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/member/:projectId/:projectMemberId/role/update')
    async memberUpdateRole(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('projectMemberId', { schema: RequestUuidSchema })
        projectMemberId: string,
        @Body({ schema: ProjectMemberUpdateRoleRequestSchema })
        body: ProjectMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.projectUpdateMemberRoleUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            projectContext,
            policyContext,
            projectMemberId,
            body
        );
    }

    @Doc({
        summary:
            'remove a project member; project admin cannot remove another admin or self (use leave)',
    })
    @Response('project.member.remove')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.ProjectMember,
        action: [EnumPolicyAction.delete],
    })
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/member/:projectId/:projectMemberId/remove')
    async memberRemove(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @ProjectContext() projectContext: IProjectContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('projectMemberId', { schema: RequestUuidSchema })
        projectMemberId: string
    ): Promise<IResponseReturn<void>> {
        return this.projectRemoveMemberUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext,
            projectContext,
            policyContext,
            projectMemberId
        );
    }

    @Doc({ summary: 'get the permissions the caller holds on a project' })
    @Response('project.permissions', {
        schema: ProjectPermissionResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected()
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/permissions/:projectId')
    async permissions(
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<ProjectPermissionResponseDto>> {
        return this.projectGetPermissionsUseCase.execute(policyContext);
    }

    @Doc({ summary: 'leave a project; any project role may leave' })
    @Response('project.member.leave')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/member/:projectId/leave')
    async memberLeave(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @ProjectContext() projectContext: IProjectContext
    ): Promise<IResponseReturn<void>> {
        return this.projectLeaveUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            projectContext
        );
    }
}
