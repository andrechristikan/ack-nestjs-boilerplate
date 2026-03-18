import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import {
    ProjectPublicGetInviteDoc,
} from '@modules/project/docs/project.public.doc';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import {
    Controller,
    Get,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.project')
@Controller({
    version: '1',
    path: '/projects',
})
export class ProjectPublicController {
    constructor(private readonly projectMemberService: ProjectMemberService) {}

    @ProjectPublicGetInviteDoc()
    @Response('project.invite.get')
    @ApiKeyProtected()
    @Get('/invites/:token')
    async getInvite(
        @Param('token', RequestRequiredPipe) token: string
    ): Promise<IResponseReturn<InvitePublicResponseDto>> {
        return this.projectMemberService
            .getInviteByToken(token)
            .then(data => ({ data }));
    }

}
