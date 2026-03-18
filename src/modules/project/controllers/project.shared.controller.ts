import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import {
    EnumProjectMemberRole,
    EnumTenantMemberRole,
    Prisma,
    UserAgent,
} from '@generated/prisma-client';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberInviteCreateRequestDto } from '@modules/project/dtos/request/project-member-invite.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectInviteResponseDto } from '@modules/project/dtos/response/project-invite.response.dto';
import { ProjectInviteSendResponseDto } from '@modules/project/dtos/response/project-invite-send.response.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import {
    ProjectSharedClaimInviteDoc,
    ProjectSharedCreateDoc,
    ProjectSharedCreateMemberDoc,
    ProjectSharedCreateMemberInviteDoc,
    ProjectSharedDeleteDoc,
    ProjectSharedGetDoc,
    ProjectSharedLeaveMemberDoc,
    ProjectSharedListDoc,
    ProjectSharedListInvitesDoc,
    ProjectSharedListMemberRolesDoc,
    ProjectSharedListMembersDoc,
    ProjectSharedRevokeInviteDoc,
    ProjectSharedRevokeMemberDoc,
    ProjectSharedSendMemberInviteDoc,
    ProjectSharedUpdateDoc,
    ProjectSharedUpdateMemberDoc,
    ProjectSharedUpdateSlugDoc,
} from '@modules/project/docs/project.tenant.shared.doc';
import {
    ProjectMemberCurrent,
    ProjectRoleProtected,
} from '@modules/project/decorators/project.decorator';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { ProjectService } from '@modules/project/services/project.service';
import {
    TenantCurrent,
    TenantMemberCurrent,
    TenantRoleProtected,
} from '@modules/tenant/decorators/tenant.decorator';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { UserProtected } from '@modules/user/decorators/user.decorator';
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';

@ApiTags('modules.shared.project')
@Controller({
    version: '1',
    path: '/tenants/projects',
})
export class ProjectSharedController {
    constructor(
        private readonly projectService: ProjectService,
        private readonly projectMemberService: ProjectMemberService
    ) {}

    @ProjectSharedListDoc()
    @ResponsePaging('project.list')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('')
    async list(
        @TenantCurrent() tenant: ITenant,
        @TenantMemberCurrent() tenantMember: ITenantMember,
        @AuthJwtPayload('userId') userId: string,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        return this.projectService.getListByTenant(
            tenant.id,
            userId,
            tenantMember.role,
            pagination
        );
    }

    @ProjectSharedCreateDoc()
    @Response('project.create')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
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

    @ProjectSharedGetDoc()
    @Response('project.get')
    @ProjectRoleProtected(
        EnumProjectMemberRole.admin,
        EnumProjectMemberRole.member,
        EnumProjectMemberRole.viewer
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId')
    async get(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.getOne(projectId);
    }

    @ProjectSharedUpdateDoc()
    @Response('project.update')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:projectId')
    async update(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        projectId: string,
        @Body() body: ProjectUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.update(projectId, body, updatedBy);
    }

    @ProjectSharedUpdateSlugDoc()
    @Response('project.update')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:projectId/slug')
    async updateSlug(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        projectId: string,
        @Body() body: ProjectUpdateSlugRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.updateSlug(projectId, body, updatedBy);
    }

    @ProjectSharedDeleteDoc()
    @Response('project.delete')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:projectId')
    async delete(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.delete(projectId, updatedBy);
    }

    @ProjectSharedCreateMemberDoc()
    @Response('project.member.create')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:projectId/members')
    async createMember(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @Body() body: ProjectMemberCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.projectMemberService.create(projectId, body, createdBy);
    }

    @ProjectSharedCreateMemberInviteDoc()
    @Response('project.member.invite.create')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('project.inviteAllowed')
    @ApiKeyProtected()
    @Post('/:projectId/members/invites')
    async createMemberInvite(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @Body() body: ProjectMemberInviteCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<IResponseReturn<ProjectInviteResponseDto>> {
        return this.projectMemberService.createInvite(
            projectId,
            body,
            createdBy,
            { ipAddress, userAgent }
        );
    }

    @ProjectSharedListInvitesDoc()
    @ResponsePaging('project.member.invite.list')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('project.inviteAllowed')
    @ApiKeyProtected()
    @Get('/:projectId/members/invites')
    async listMemberInvites(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectInviteSelect,
            Prisma.ProjectInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectInviteResponseDto>> {
        return this.projectMemberService.listInvites(projectId, pagination);
    }

    @ProjectSharedRevokeInviteDoc()
    @Response('project.member.invite.revoke')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('project.inviteAllowed')
    @ApiKeyProtected()
    @Delete('/:projectId/members/invites/:inviteId')
    async revokeMemberInvite(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @Param('inviteId', RequestRequiredPipe, RequestIsValidObjectIdPipe) inviteId: string,
        @AuthJwtPayload('userId') revokedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectMemberService.revokeInvite(
            projectId,
            inviteId,
            revokedBy
        );
    }

    @ProjectSharedClaimInviteDoc()
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('project.inviteAllowed')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/invites/:token/claim')
    async claimInvite(
        @Param('token', RequestRequiredPipe) token: string,
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<void> {
        return this.projectMemberService.claimRegistered(token, userId, {
            ipAddress,
            userAgent,
        });
    }

    @ProjectSharedSendMemberInviteDoc()
    @Response('project.member.invite.send')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('project.inviteAllowed')
    @ApiKeyProtected()
    @Post('/:projectId/members/invites/:inviteId/send')
    async sendMemberInvite(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @Param('inviteId', RequestRequiredPipe, RequestIsValidObjectIdPipe) inviteId: string,
        @AuthJwtPayload('userId') requestedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<IResponseReturn<ProjectInviteSendResponseDto>> {
        return this.projectMemberService.sendInvite(
            projectId,
            inviteId,
            requestedBy,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @ProjectSharedUpdateMemberDoc()
    @Response('project.member.update')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:projectId/members/:memberId')
    async updateMember(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @Param('memberId', RequestRequiredPipe, RequestIsValidObjectIdPipe) memberId: string,
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

    @ProjectSharedListMembersDoc()
    @ResponsePaging('project.member.list')
    @ProjectRoleProtected(
        EnumProjectMemberRole.admin,
        EnumProjectMemberRole.member,
        EnumProjectMemberRole.viewer
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId/members')
    async listMembers(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectMemberSelect,
            Prisma.ProjectMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        return this.projectMemberService.listMembers(projectId, pagination);
    }

    @ProjectSharedListMemberRolesDoc()
    @Response('project.member.roles')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId/members/roles')
    async listMemberRoles(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string
    ): Promise<IResponseReturn<EnumProjectMemberRole[]>> {
        return this.projectMemberService.getMemberRoles(projectId);
    }

    @ProjectSharedLeaveMemberDoc()
    @Response('project.member.leave')
    @ProjectRoleProtected(
        EnumProjectMemberRole.admin,
        EnumProjectMemberRole.member,
        EnumProjectMemberRole.viewer
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:projectId/members/me')
    async leaveMember(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.projectMemberService.leave(projectId, userId);
    }

    @ProjectSharedRevokeMemberDoc()
    @Response('project.member.revoke')
    @ProjectRoleProtected(EnumProjectMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:projectId/members/:memberId')
    async revokeMember(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe) projectId: string,
        @Param('memberId', RequestRequiredPipe, RequestIsValidObjectIdPipe) memberId: string,
        @AuthJwtPayload('userId') revokedBy: string,
        @TenantMemberCurrent() tenantMember: ITenantMember,
        @ProjectMemberCurrent() projectMember: IProjectMember | undefined
    ): Promise<IResponseReturn<void>> {
        return this.projectMemberService.revoke(
            projectId,
            memberId,
            revokedBy,
            tenantMember.role,
            projectMember?.role
        );
    }
}
