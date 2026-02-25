import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { InvitationListResponseDto } from '@modules/invitation/dtos/response/invitation-list.response.dto';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
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
        return this.invitationService.listInvitationsForUser(userId);
    }
}
