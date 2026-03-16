import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAgent } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { InviteClaimRequestDto } from '@modules/invite/dtos/request/invite-claim.request.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteService } from '@modules/invite/services/invite.service';
import { TenantInviteType } from '@modules/tenant/constants/tenant.constant';
import {
    TenantPublicClaimInviteDoc,
    TenantPublicGetInviteDoc,
} from '@modules/tenant/docs/tenant.public.doc';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
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
    constructor(
        private readonly inviteService: InviteService,
        private readonly tenantMemberService: TenantMemberService
    ) {}

    @TenantPublicGetInviteDoc()
    @Response('tenant.invite.get')
    @ApiKeyProtected()
    @Get('/invites/:token')
    async getInvite(
        @Param('token', RequestRequiredPipe) token: string
    ): Promise<IResponseReturn<InvitePublicResponseDto>> {
        return this.inviteService
            .getInvite(token, TenantInviteType)
            .then(data => ({ data }));
    }

    @TenantPublicClaimInviteDoc()
    @HttpCode(HttpStatus.OK)
    @ApiKeyProtected()
    @Post('/invites/:token/claim')
    async claimInvite(
        @Param('token', RequestRequiredPipe) token: string,
        @Body() { firstName, lastName, password }: InviteClaimRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<void> {
        return this.tenantMemberService.claimInvite(
            token,
            firstName,
            lastName,
            password,
            { ipAddress, userAgent }
        );
    }
}
