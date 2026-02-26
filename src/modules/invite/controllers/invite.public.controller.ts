import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { InviteSignupRequestDto } from '@modules/invite/dtos/request/invite-signup.request.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteService } from '@modules/invite/services/invite.service';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.invite')
@Controller({
    version: '1',
    path: '/invite',
})
export class InvitePublicController {
    constructor(private readonly inviteService: InviteService) {}

    @Response('invite.get')
    @ApiKeyProtected()
    @Get('/:token')
    async get(
        @Param('token') token: string
    ): Promise<IResponseReturn<InvitePublicResponseDto>> {
        return this.inviteService.getInvite(token);
    }

    @Response('invite.signup')
    @ApiKeyProtected()
    @Put('/signup')
    async signup(
        @Body() body: InviteSignupRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.inviteService.signupByInvite(body, {
            ipAddress,
            userAgent,
        });
    }
}
