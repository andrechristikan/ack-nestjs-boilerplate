import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
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
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import {
    ProjectCurrent,
    ProjectMemberCurrent,
    ProjectMemberProtected,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';
import { ProjectService } from '@modules/project/services/project.service';
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
    constructor(private readonly projectService: ProjectService) {}

    @ProjectUserListDoc()
    @ResponsePaging('project.list')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >,
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        return this.projectService.getListForMember(
            workspace.id,
            workspaceMember,
            pagination
        );
    }

    @ProjectUserCreateDoc()
    @Response('project.create')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @WorkspaceCurrent() workspace: Workspace,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body() body: ProjectCreateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.createProject(
            workspace.id,
            workspaceMember.userId,
            body
        );
    }

    @ProjectUserGetDoc()
    @Response('project.get')
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
    @Get('/get/:projectId')
    async get(
        @ProjectCurrent() project: Project
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.getProject(project);
    }

    @ProjectUserUpdateDoc()
    @Response('project.update')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:projectId')
    async update(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body() body: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.updateProject(
            project,
            workspaceMember.userId,
            body
        );
    }

    @ProjectUserUpdateSlugDoc()
    @Response('project.updateSlug')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:projectId/slug')
    async updateSlug(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body() body: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.updateProjectSlug(
            project,
            workspaceMember.userId,
            body.slug
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
    @Delete('/delete/:projectId')
    async softDelete(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember
    ): Promise<void> {
        await this.projectService.softDeleteProject(
            project,
            workspaceMember.userId
        );
    }

    @ProjectMemberUserListDoc()
    @ResponsePaging('project.member.list')
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
    @Get('/member/:projectId/list')
    async memberList(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectMemberSelect,
            Prisma.ProjectMemberWhereInput
        >,
        @ProjectCurrent() project: Project
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        return this.projectService.getMembersList(project, pagination);
    }

    @ProjectMemberUserAssignDoc()
    @Response('project.member.assign')
    @TermPolicyAcceptanceProtected()
    @ProjectMemberProtected(EnumProjectMemberRole.admin)
    @ProjectProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/member/:projectId/assign')
    async memberAssign(
        @ProjectCurrent() project: Project,
        @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember,
        @Body() body: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<ProjectMemberResponseDto>> {
        return this.projectService.assignMember(
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
        @Body() body: ProjectMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.projectService.updateMemberRole(
            project,
            workspaceMember.userId,
            projectMemberId,
            body.role
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
        await this.projectService.removeMember(
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
    @HttpCode(HttpStatus.OK)
    @Post('/member/:projectId/leave')
    async memberLeave(
        @ProjectCurrent() project: Project,
        @ProjectMemberCurrent() projectMember: ProjectMember
    ): Promise<void> {
        await this.projectService.leaveProject(project, projectMember);
    }
}
