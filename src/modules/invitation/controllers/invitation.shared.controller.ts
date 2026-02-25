import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { InvitationAcceptRequestDto } from '@modules/invitation/dtos/request/invitation-accept.request.dto';
import { InvitationListResponseDto } from '@modules/invitation/dtos/response/invitation-list.response.dto';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.invitation')
@Controller({
    version: '1',
    path: '/invitations',
})
export class InvitationSharedController {
    constructor(private readonly invitationService: InvitationService) {}

    @Response('invitation.listPending')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<InvitationListResponseDto[]>> {
        return this.invitationService.listInvitations({
            userId,
            pendingOnly: true,
        });
    }

    @Response('invitation.acceptInvitation')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/accept')
    async acceptInvitation(
        @Body() body: InvitationAcceptRequestDto,
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.invitationService.acceptInvitation(body, userId, {
            ipAddress,
            userAgent,
        });
    }
}
