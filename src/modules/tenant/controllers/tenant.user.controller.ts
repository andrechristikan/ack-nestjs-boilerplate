import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import {
    EnumTenantMemberRole,
    Prisma,
    UserAgent,
} from '@generated/prisma-client';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
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
import {
    TenantCurrent,
    TenantMemberCurrent,
    TenantRoleProtected,
} from '@modules/tenant/decorators/tenant.decorator';
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantTransferOwnershipRequestDto } from '@modules/tenant/dtos/request/tenant.transfer-ownership.request.dto';
import { TenantUpdateSlugRequestDto } from '@modules/tenant/dtos/request/tenant.update-slug.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import {
    TenantUserClaimInviteDoc,
    TenantUserCreateInviteDoc,
    TenantUserDeleteInviteDoc,
    TenantUserListInvitesDoc,
} from '@modules/tenant/docs/tenant.invite.user.doc';
import {
    TenantUserDeleteMemberDoc,
    TenantUserGetDoc,
    TenantUserLeaveDoc,
    TenantUserListMembersDoc,
    TenantUserUpdateDoc,
    TenantUserUpdateMemberDoc,
} from '@modules/tenant/docs/tenant.user.doc';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { TenantInviteService } from '@modules/tenant/services/tenant-invite.service';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantService } from '@modules/tenant/services/tenant.service';
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

@ApiTags('modules.user.tenant')
@Controller({
    version: '1',
    path: '/tenants',
})
export class TenantUserController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly tenantMemberService: TenantMemberService,
        private readonly tenantInviteService: TenantInviteService
    ) {}

    @ResponsePaging('tenant.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Get()
    async list(
        @AuthJwtPayload('userId') userId: string,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantSelect,
            Prisma.TenantWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantResponseDto>> {
        return this.tenantService.getListByUserOffset(userId, pagination);
    }

    @TenantUserGetDoc()
    @Response('tenant.get')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Get('/:tenantId')
    async get(
        @TenantCurrent() tenant: ITenant
    ): Promise<IResponseReturn<TenantResponseDto>> {
        return this.tenantService.getOne(tenant.id);
    }

    @TenantUserUpdateDoc()
    @Response('tenant.update')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Patch('/:tenantId')
    async update(
        @TenantCurrent() tenant: ITenant,
        @TenantMemberCurrent() tenantMember: ITenantMember,
        @Body() body: TenantUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.update(
            tenant.id,
            body,
            updatedBy,
            tenantMember.role
        );
    }

    @Response('tenant.updateSlug')
    @TenantRoleProtected(EnumTenantMemberRole.owner)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Patch('/:tenantId/slug')
    async updateSlug(
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
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Patch('/:tenantId/transfer')
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
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Patch('/:tenantId/switch')
    async switchTenant(
        @Param('tenantId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        tenantId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantService.switchTenant(tenantId, userId);
    }

    @TenantUserListMembersDoc()
    @ResponsePaging('tenant.member.list')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Get('/:tenantId/members')
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

    @TenantUserUpdateMemberDoc()
    @Response('tenant.member.update')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Patch('/:tenantId/members/:memberId')
    async updateMember(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
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

    @TenantUserDeleteMemberDoc()
    @Response('tenant.member.delete')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Delete('/:tenantId/members/:memberId')
    async deleteMember(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        memberId: string,
        @AuthJwtPayload('userId') requestedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantMemberService.deleteMember(
            tenant.id,
            memberId,
            requestedBy
        );
    }

    @TenantUserLeaveDoc()
    @Response('tenant.leave')
    @TenantRoleProtected(
        EnumTenantMemberRole.owner,
        EnumTenantMemberRole.admin,
        EnumTenantMemberRole.member
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant')
    @ApiKeyProtected()
    @Delete('/:tenantId/leave')
    async leave(
        @TenantCurrent() tenant: ITenant,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.tenantMemberService.leave(tenant.id, userId);
    }

    @TenantUserCreateInviteDoc()
    @Response('tenant.member.invite.create')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant.inviteAllowed')
    @ApiKeyProtected()
    @Post('/:tenantId/invites')
    async createInvite(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantInviteCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<IResponseReturn<TenantInviteResponseDto>> {
        return this.tenantInviteService.createInvite(tenant, body, createdBy, {
            ipAddress,
            userAgent,
        });
    }

    @TenantUserDeleteInviteDoc()
    @Response('tenant.invite.revoke')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant.inviteAllowed')
    @ApiKeyProtected()
    @Delete('/:tenantId/invites/:inviteId')
    async revokeInvite(
        @TenantCurrent() tenant: ITenant,
        @Param('inviteId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        inviteId: string,
        @AuthJwtPayload('userId') revokedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<IResponseReturn<void>> {
        return this.tenantInviteService.revokeInvite(
            inviteId,
            tenant.id,
            revokedBy,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @TenantUserListInvitesDoc()
    @ResponsePaging('tenant.invite.list')
    @TenantRoleProtected(EnumTenantMemberRole.owner, EnumTenantMemberRole.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant.inviteAllowed')
    @ApiKeyProtected()
    @Get('/:tenantId/invites')
    async listInvites(
        @TenantCurrent() tenant: ITenant,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantInviteSelect,
            Prisma.TenantInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantInviteResponseDto>> {
        return this.tenantInviteService.listInvites(tenant.id, pagination);
    }

    @TenantUserClaimInviteDoc()
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('tenant.inviteAllowed')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/invites/:token/claim')
    async claimInvite(
        @Param('token', RequestRequiredPipe) token: string,
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('email') userEmail: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<void> {
        return this.tenantInviteService.claimRegistered(
            token,
            userId,
            userEmail,
            {
                ipAddress,
                userAgent,
            }
        );
    }
}
