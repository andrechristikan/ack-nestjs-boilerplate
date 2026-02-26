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
import { InviteAcceptRequestDto } from '@modules/invite/dtos/request/invite-accept.request.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InviteService } from '@modules/invite/services/invite.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.invite')
@Controller({
    version: '1',
    path: '/invites',
})
export class InviteSharedController {
    constructor(private readonly inviteService: InviteService) {}

    @Response('invite.listPending')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<InviteListResponseDto[]>> {
        return this.inviteService.listInvites({
            userId,
            pendingOnly: true,
        });
    }

    @Response('invite.accept')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/accept')
    async accept(
        @Body() body: InviteAcceptRequestDto,
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.inviteService.acceptInvite(body, userId, {
            ipAddress,
            userAgent,
        });
    }
}
