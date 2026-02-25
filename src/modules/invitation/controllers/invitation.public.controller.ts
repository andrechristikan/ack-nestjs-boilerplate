import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { InvitationAcceptRequestDto } from '@modules/invitation/dtos/request/invitation-accept.request.dto';
import { InvitationCompleteRequestDto } from '@modules/invitation/dtos/request/invitation-complete.request.dto';
import { InvitationPublicResponseDto } from '@modules/invitation/dtos/response/invitation-public.response.dto';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.invitation')
@Controller({
    version: '1',
    path: '/invitation',
})
export class InvitationPublicController {
    constructor(private readonly invitationService: InvitationService) {}

    @Response('invitation.getInvitation')
    @ApiKeyProtected()
    @Get('/:token')
    async getInvitation(
        @Param('token') token: string
    ): Promise<IResponseReturn<InvitationPublicResponseDto>> {
        return this.invitationService.getInvitation(token);
    }

    @Response('invitation.acceptInvitation')
    @ApiKeyProtected()
    @Put('/accept')
    async acceptInvitation(
        @Body() body: InvitationAcceptRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.invitationService.acceptInvitation(body, {
            ipAddress,
            userAgent,
        });
    }

    @Response('invitation.completeInvitation')
    @ApiKeyProtected()
    @Put('/complete')
    async completeInvitation(
        @Body() body: InvitationCompleteRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.invitationService.completeInvitation(body, {
            ipAddress,
            userAgent,
        });
    }
}
