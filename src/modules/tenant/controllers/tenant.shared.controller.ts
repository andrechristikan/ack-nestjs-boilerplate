import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { EnumTenantMemberRole, Prisma, UserAgent } from '@generated/prisma-client';
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
    TenantCurrent,
    TenantRoleProtected,
} from '@modules/tenant/decorators/tenant.decorator';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member-invite.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantTransferOwnershipRequestDto } from '@modules/tenant/dtos/request/tenant.transfer-ownership.request.dto';
import { TenantUpdateSlugRequestDto } from '@modules/tenant/dtos/request/tenant.update-slug.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
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
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
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
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin
    )
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

    @Response('tenant.updateSlug')
    @TenantRoleProtected(EnumTenantMemberRole.owner)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/current/tenant/slug')
    async updateCurrentTenantSlug(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantUpdateSlugRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.updateSlug(tenant.id, body, updatedBy);
    }

    @Response('tenant.transferOwnership')
    @TenantRoleProtected(EnumTenantMemberRole.owner)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/current/ownership/transfer')
    async transferOwnership(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantTransferOwnershipRequestDto,
        @AuthJwtPayload('userId') requestedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.transferOwnership(
            tenant.id,
            body,
            requestedBy
        );
    }

    @Response('tenant.switch')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/switch/:tenantId')
    async switchTenant(
        @Param('tenantId', RequestRequiredPipe) tenantId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.switchTenant(tenantId, userId);
    }

    @TenantSharedListMembersDoc()
    @ResponsePaging('tenant.member.list')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current/members')
    async listMembers(
        @TenantCurrent() tenant: ITenant,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantMemberSelect,
            Prisma.TenantMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        return this.tenantMemberService.getMembersOffset(tenant.id, pagination);
    }

    @TenantSharedListMemberRolesDoc()
    @Response('tenant.member.roles')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current/members/roles')
    async listMemberRoles(): Promise<IResponseReturn<EnumTenantMemberRole[]>> {
        return {
            data: Object.values(EnumTenantMemberRole),
        };
    }

    @TenantSharedCreateMemberDoc()
    @Response('tenant.member.create')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/current/members')
    async createMember(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantMemberCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.tenantMemberService.createMember(
            tenant.id,
            body,
            createdBy
        );
    }

    @TenantSharedCreateMemberInviteDoc()
    @Response('tenant.member.invite.create')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenantInvites')
    @ApiKeyProtected()
    @Post('/current/members/invites')
    async createMemberInvite(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantMemberInviteCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<IResponseReturn<InviteCreateResponseDto>> {
        return this.tenantMemberService.createInvite(
            tenant.id,
            body,
            createdBy,
            { ipAddress, userAgent }
        );
    }

    @TenantSharedSendMemberInviteDoc()
    @Response('tenant.member.invite.send')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenantInvites')
    @ApiKeyProtected()
    @Post('/current/members/:memberId/invites/send')
    async sendMemberInvite(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe) memberId: string,
        @AuthJwtPayload('userId') requestedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
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
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin
    )
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
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/current/members/:memberId')
    async deleteMember(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe)
        memberId: string,
        @AuthJwtPayload('userId') requestedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantMemberService.deleteMember(
            tenant.id,
            memberId,
            requestedBy
        );
    }
}
