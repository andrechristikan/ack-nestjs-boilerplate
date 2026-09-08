import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
    Prisma,
    Project,
    ProjectMember,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    ProjectMemberUserAssignDoc,
    ProjectMemberUserLeaveDoc,
    ProjectMemberUserListDoc,
    ProjectMemberUserRemoveDoc,
    ProjectMemberUserUpdateRoleDoc,
    ProjectUserCreateDoc,
    ProjectUserGetDoc,
    ProjectUserListDoc,
    ProjectUserSoftDeleteDoc,
    ProjectUserUpdateDoc,
    ProjectUserUpdateSlugDoc,
} from '@modules/project/docs/project.user.doc';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
    ProjectMemberDefaultAvailableOrderBy,
} from '@modules/project/constants/project.list.constant';
import {
    ProjectCreateRequestDto,
    ProjectCreateRequestSchema,
} from '@modules/project/dtos/request/project.create.request.dto';
import {
    ProjectMemberAssignRequestDto,
    ProjectMemberAssignRequestSchema,
} from '@modules/project/dtos/request/project.member-assign.request.dto';
import {
    ProjectMemberUpdateRoleRequestDto,
    ProjectMemberUpdateRoleRequestSchema,
} from '@modules/project/dtos/request/project.member-update-role.request.dto';
import {
    ProjectUpdateSlugRequestDto,
    ProjectUpdateSlugRequestSchema,
} from '@modules/project/dtos/request/project.update-slug.request.dto';
import {
    ProjectUpdateRequestDto,
    ProjectUpdateRequestSchema,
} from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseSchema } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import {
    ProjectCurrent,
    ProjectMemberCurrent,
    ProjectMemberProtected,
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

    @ProjectUserListDoc()
    @ResponsePaging('project.list', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: ProjectDefaultAvailableSearch,
            availableOrderBy: ProjectCursorAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>,
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember
    ): Promise<IResponsePagingReturn<Project>> {
        return this.projectHttpService.getListForMember(
            workspace.id,
            workspaceMember,
            pagination
        );
    }

    @ProjectUserCreateDoc()
    @Response('project.create', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
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

    @ProjectUserGetDoc()
    @Response('project.get', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(
        EnumProjectMemberRole.admin,
        EnumProjectMemberRole.member,
        EnumProjectMemberRole.viewer
    )
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

    @ProjectUserUpdateDoc()
    @Response('project.update', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
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

    @ProjectUserUpdateSlugDoc()
    @Response('project.updateSlug', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
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

    @ProjectUserSoftDeleteDoc()
    @Response('project.softDelete')
    @TermPolicyAcceptanceProtected()
    @ProjectProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
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

    @ProjectMemberUserListDoc()
    @ResponsePaging('project.member.list', {
        schema: ProjectMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(
        EnumProjectMemberRole.admin,
        EnumProjectMemberRole.member,
        EnumProjectMemberRole.viewer
    )
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
        @PaginationCursorQuery({
            availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>,
        @ProjectCurrent() project: Project
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.projectMemberHttpService.getMembersList(
            project,
            pagination
        );
    }

    @ProjectMemberUserAssignDoc()
    @Response('project.member.assign', {
        schema: ProjectMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
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

    @ProjectMemberUserUpdateRoleDoc()
    @Response('project.member.updateRole')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
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
        @Param(
            'projectMemberId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
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

    @ProjectMemberUserRemoveDoc()
    @Response('project.member.remove')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
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
        @Param(
            'projectMemberId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        projectMemberId: string
    ): Promise<void> {
        await this.projectMemberHttpService.removeMember(
            project,
            workspaceMember.userId,
            projectMemberId
        );
    }

    @ProjectMemberUserLeaveDoc()
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
        @ProjectMemberCurrent() projectMember: ProjectMember
    ): Promise<void> {
        await this.projectMemberHttpService.leaveProject(
            project,
            projectMember
        );
    }
}
