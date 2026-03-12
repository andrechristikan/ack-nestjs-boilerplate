import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { UserAgent } from '@generated/prisma-client';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { InviteClaimRequestDto } from '@modules/invite/dtos/request/invite-claim.request.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteService } from '@modules/invite/services/invite.service';
import { ProjectInviteType } from '@modules/project/constants/project.constant';
import {
    ProjectPublicClaimInviteDoc,
    ProjectPublicGetInviteDoc,
} from '@modules/project/docs/project.public.doc';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
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

@ApiTags('modules.public.project')
@Controller({
    version: '1',
    path: '/projects',
})
export class ProjectPublicController {
    constructor(
        private readonly inviteService: InviteService,
        private readonly projectMemberService: ProjectMemberService
    ) {}

    @ProjectPublicGetInviteDoc()
    @Response('project.invite.get')
    @ApiKeyProtected()
    @Get('/invites/:token')
    async getInvite(
        @Param('token', RequestRequiredPipe) token: string
    ): Promise<IResponseReturn<InvitePublicResponseDto>> {
        return this.inviteService
            .getInvite(token, ProjectInviteType)
            .then(data => ({ data }));
    }

    @ProjectPublicClaimInviteDoc()
    @HttpCode(HttpStatus.OK)
    @ApiKeyProtected()
    @Post('/invites/:token/claim')
    async claimInvite(
        @Param('token', RequestRequiredPipe) token: string,
        @Body() { firstName, lastName, password }: InviteClaimRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent
    ): Promise<void> {
        return this.projectMemberService.claimInvite(
            token,
            firstName,
            lastName,
            password,
            { ipAddress, userAgent }
        );
    }
}
