import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    PaginationCursorQuery,
    PaginationOffsetQuery,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
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
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import {
    TenantCurrent,
    TenantMemberProtected,
    TenantPermissionProtected,
} from '@modules/tenant/decorators/tenant.decorator';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
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
    constructor(private readonly tenantService: TenantService) {}

    @ResponsePaging('tenant.memberships')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/memberships')
    async memberships(
        @AuthJwtPayload('userId') userId: string,
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        return this.tenantService.getMyTenantsCursor(userId, pagination);
    }

    @Response('tenant.current')
    @TenantMemberProtected()
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    //@ApiKeyProtected()
    @Get('/current')
    async current(
        @AuthJwtPayload('userId') userId: string,
        @TenantCurrent() tenant: ITenant
    ): Promise<IResponseReturn<TenantMemberResponseDto>> {
        return this.tenantService.getCurrentTenant(tenant.id, userId);
    }

    @Response('tenant.get')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.read],
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current/tenant')
    async getCurrentTenant(
        @TenantCurrent() tenant: ITenant
    ): Promise<IResponseReturn<TenantResponseDto>> {
        return this.tenantService.getOne(tenant.id);
    }

    @Response('tenant.update')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.update],
    })
    @TermPolicyAcceptanceProtected()
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

    @ResponsePaging('tenant.member.list')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.read],
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/current/members')
    async listMembers(
        @TenantCurrent() tenant: ITenant,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        return this.tenantService.getMembersOffset(tenant.id, pagination);
    }

    @Response('tenant.member.create')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.create],
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/current/members')
    async createMember(
        @TenantCurrent() tenant: ITenant,
        @Body() body: TenantMemberCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.tenantService.addMember(tenant.id, body, createdBy);
    }

    @Response('tenant.member.update')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.update],
    })
    @TermPolicyAcceptanceProtected()
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
        return this.tenantService.updateMember(
            tenant.id,
            memberId,
            body,
            updatedBy
        );
    }

    @Response('tenant.member.delete')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenantMember,
        action: [EnumPolicyAction.delete],
    })
    @TermPolicyAcceptanceProtected()
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
        return this.tenantService.deleteMember(tenant.id, memberId, updatedBy);
    }
}
