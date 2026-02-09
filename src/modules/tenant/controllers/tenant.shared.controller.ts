import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
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
    TenantCurrent,
    TenantMemberProtected,
} from '@modules/tenant/decorators/tenant.decorator';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
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
    @ApiKeyProtected()
    @Get('/current')
    async current(
        @AuthJwtPayload('userId') userId: string,
        @TenantCurrent() tenant: ITenant
    ): Promise<IResponseReturn<TenantMemberResponseDto>> {
        return this.tenantService.getCurrentTenant(tenant.id, userId);
    }
}
