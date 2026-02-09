import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TenantPublicLoginCredentialDoc } from '@modules/tenant/docs/tenant.public.doc';
import { TenantLoginRequestDto } from '@modules/tenant/dtos/request/tenant.login.request.dto';
import { TenantLoginResponseDto } from '@modules/tenant/dtos/response/tenant.login.response.dto';
import { TenantAuthService } from '@modules/tenant/services/tenant-auth.service';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.tenant')
@Controller({
    version: '1',
    path: '/tenant',
})
export class TenantPublicController {
    constructor(private readonly tenantAuthService: TenantAuthService) {}

    @TenantPublicLoginCredentialDoc()
    @Response('tenant.loginCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @FeatureFlagProtected('loginWithCredential')
    @Post('/login/credential')
    async loginWithCredential(
        @Body() body: TenantLoginRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<TenantLoginResponseDto>> {
        return this.tenantAuthService.loginCredential(body, {
            ipAddress,
            userAgent,
        });
    }
}
