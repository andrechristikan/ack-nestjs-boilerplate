import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
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
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import {
    TenantCurrent,
    TenantPermissionProtected,
} from '@modules/tenant/decorators/tenant.decorator';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member-invite.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import {
    TenantSharedCreateMemberDoc,
    TenantSharedCreateMemberInviteDoc,
    TenantSharedDeleteMemberDoc,
    TenantSharedGetCurrentTenantDoc,
    TenantSharedListMemberRolesDoc,
    TenantSharedListMembersDoc,
    TenantSharedSendMemberInviteDoc,
    TenantSharedUpdateCurrentTenantDoc,
    TenantSharedUpdateMemberDoc,
} from '@modules/tenant/docs/tenant.shared.doc';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.tenant')
@Controller({
    version: '1',
    path: '/tenants',
})
export class TenantSharedController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly tenantMemberService: TenantMemberService
    ) {}

    @TenantSharedGetCurrentTenantDoc()
    @Response('tenant.get')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current')
    async getCurrentTenant(
        @TenantCurrent() tenant: ITenant
    ): Promise<IResponseReturn<TenantResponseDto>> {
        return this.tenantService.getOne(tenant.id);
    }

    @TenantSharedUpdateCurrentTenantDoc()
    @Response('tenant.update')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/current/tenant')
    async updateCurrentTenant(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.update(tenant.id, body, updatedBy);
    }

    @TenantSharedListMembersDoc()
    @ResponsePaging('tenant.member.list')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current/members')
    async listMembers(
        @TenantCurrent() tenant: ITenant,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        return this.tenantMemberService.getMembersOffset(tenant.id, pagination);
    }

    @TenantSharedListMemberRolesDoc()
    @Response('tenant.member.roles')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.create],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current/members/roles')
    async listMemberRoles(): Promise<
        IResponseReturn<RoleListResponseDto[]>
    > {
        return this.tenantMemberService.getMemberRoles();
    }

    @TenantSharedCreateMemberDoc()
    @Response('tenant.member.create')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.create],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/current/members')
    async createMember(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantMemberCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.tenantMemberService.createMember(tenant.id, body, createdBy);
    }

    @TenantSharedCreateMemberInviteDoc()
    @FeatureFlagProtected('tenantInvites')
    @Response('tenant.member.invite.create')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.create],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/current/members/invites')
    async createMemberInvite(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantMemberInviteCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<InviteCreateResponseDto>> {
        return this.tenantMemberService.createInvite(
            tenant.id,
            body,
            createdBy,
            { ipAddress, userAgent }
        );
    }

    @TenantSharedSendMemberInviteDoc()
    @FeatureFlagProtected('tenantInvites')
    @Response('tenant.member.invite.send')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.create],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/current/members/:memberId/invites/send')
    async sendMemberInvite(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe) memberId: string,
        @AuthJwtPayload('userId') requestedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<InviteSendResponseDto>> {
        return this.tenantMemberService.sendInvite(
            tenant.id,
            memberId,
            requestedBy,
            { ipAddress, userAgent }
        );
    }

    @TenantSharedUpdateMemberDoc()
    @Response('tenant.member.update')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/current/members/:memberId')
    async updateMember(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe)
        memberId: string,
        @Body() body: TenantMemberUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantMemberService.updateMember(
            tenant.id,
            memberId,
            body,
            updatedBy
        );
    }

    @TenantSharedDeleteMemberDoc()
    @Response('tenant.member.delete')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.delete],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/current/members/:memberId')
    async deleteMember(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe)
        memberId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantMemberService.deleteMember(
            tenant.id,
            memberId,
            updatedBy
        );
    }
}
