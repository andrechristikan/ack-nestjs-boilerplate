import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAgent } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    TenantPublicGetInviteDoc,
    TenantPublicSignupAndClaimDoc,
} from '@modules/tenant/docs/tenant.invite.public.doc';
import { TenantInviteSignupRequestDto } from '@modules/tenant/dtos/request/tenant-invite-signup.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { TenantInviteService } from '@modules/tenant/services/tenant-invite.service';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.tenant')
@Controller({
    version: '1',
    path: '/tenants',
})
export class TenantPublicController {
    constructor(private readonly tenantInviteService: TenantInviteService) {}

    @TenantPublicGetInviteDoc()
    @Response('tenant.invite.get')
    @FeatureFlagProtected('tenantInvites')
    @ApiKeyProtected()
    @Get('/invites/:token')
    async getInvite(
        @Param('token', RequestRequiredPipe) token: string
    ): Promise<IResponseReturn<TenantInviteResponseDto>> {
        return this.tenantInviteService.getInviteByToken(token);
    }

    @TenantPublicSignupAndClaimDoc()
    @HttpCode(HttpStatus.OK)
    @FeatureFlagProtected('tenantInvites')
    @ApiKeyProtected()
    @Post('/invites/:token/signup')
    async signupAndClaim(
        @Param('token', RequestRequiredPipe) token: string,
        @Body() body: TenantInviteSignupRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<void> {
        return this.tenantInviteService.signupAndClaim(token, body, {
            ipAddress,
            userAgent,
        });
    }
}
