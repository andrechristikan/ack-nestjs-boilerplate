import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response, ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn, IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected, AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    ProjectMemberPolicyCreate,
    ProjectMemberPolicyRead,
    ProjectMemberPolicyUpdate,
    ProjectPolicyCreate,
    ProjectPolicyDelete,
    ProjectPolicyRead,
    ProjectPolicyUpdate,
} from '@modules/project/constants/project.policy.constant';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { InvitationCreateRequestDto } from '@modules/invitation/dtos/request/invitation.create.request.dto';
import { InvitationCreateResponseDto } from '@modules/invitation/dtos/response/invitation-create.response.dto';
import { InvitationSendResponseDto } from '@modules/invitation/dtos/response/invitation-send.response.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { ProjectPermissionProtected } from '@modules/project/decorators/project.decorator';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { ProjectService } from '@modules/project/services/project.service';
import { TenantCurrent, TenantMemberProtected, TenantPermissionProtected, TenantProtected } from '@modules/tenant/decorators/tenant.decorator';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.project')
@Controller({
    version: '1',
    path: '/tenants/projects',
})
export class ProjectTenantSharedController {
    constructor(
        private readonly projectService: ProjectService,
        private readonly projectMemberService: ProjectMemberService
    ) {}

    @ResponsePaging('project.list')
    @TenantPermissionProtected(ProjectPolicyRead)
    @TenantProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('')
    async list(
        @TenantCurrent() tenant: ITenant,
        @PaginationOffsetQuery() pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        return this.projectService.getListByTenant(tenant.id, pagination);
    }

    @Response('project.create')
    @TenantPermissionProtected(ProjectPolicyCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('')
    async create(
        @TenantCurrent() tenant: ITenant,
        @Body() body: ProjectCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.projectService.createForTenant(tenant.id, body, createdBy);
    }

    @Response('project.get')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectPolicyRead)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId')
    async get(
        @Param('projectId', RequestRequiredPipe) projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.getOne(projectId);
    }

    @Response('project.update')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectPolicyUpdate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:projectId')
    async update(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Body() body: ProjectUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.update(projectId, body, updatedBy);
    }

    @Response('project.delete')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectPolicyDelete)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:projectId')
    async delete(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.delete(projectId, updatedBy);
    }

    @Response('project.member.create')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectMemberPolicyCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:projectId/members')
    async createMember(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Body() body: ProjectMemberCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.projectMemberService.create(projectId, body, createdBy);
    }

    @Response('project.member.invitation.create')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectMemberPolicyCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:projectId/members/invitations')
    async createMemberInvitation(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Body() body: InvitationCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<InvitationCreateResponseDto>> {
        return this.projectMemberService.createInvitation(
            projectId,
            body,
            createdBy,
            { ipAddress, userAgent }
        );
    }

    @Response('project.member.invitation.send')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectMemberPolicyCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:projectId/members/:memberId/invitations/send')
    async sendMemberInvitation(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Param('memberId', RequestRequiredPipe) memberId: string,
        @AuthJwtPayload('userId') requestedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<InvitationSendResponseDto>> {
        return this.projectMemberService.sendInvitation(
            projectId,
            memberId,
            requestedBy,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @Response('project.member.update')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectMemberPolicyUpdate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:projectId/members/:memberId')
    async updateMember(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Param('memberId', RequestRequiredPipe) memberId: string,
        @Body() body: ProjectMemberUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectMemberService.update(
            projectId,
            memberId,
            body,
            updatedBy
        );
    }

    @ResponsePaging('project.member.list')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectMemberPolicyRead)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId/members')
    async listMembers(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @PaginationOffsetQuery() pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        return this.projectMemberService.listMembers(projectId, pagination);
    }

    @Response('project.member.roles')
    @TenantMemberProtected()
    @ProjectPermissionProtected(ProjectMemberPolicyCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId/members/roles')
    async listMemberRoles(
        @Param('projectId', RequestRequiredPipe) projectId: string
    ): Promise<IResponseReturn<RoleListResponseDto[]>> {
        return this.projectMemberService.getMemberRoles(projectId);
    }
}
