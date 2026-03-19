import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { ProjectPublicGetInviteDoc } from '@modules/project/docs/project.public.doc';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import {
    Controller,
    Get,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ProjectInvitePublicResponseDto } from '@modules/project/dtos/response/project-invite-public.response.dto';

@ApiTags('modules.public.project')
@Controller({
    version: '1',
    path: '/projects',
})
export class ProjectPublicController {
    constructor(private readonly projectMemberService: ProjectMemberService) {}

    @ProjectPublicGetInviteDoc()
    @ApiKeyProtected()
    @Get('/invites/:token')
    async getInvite(
        @Param('token', RequestRequiredPipe) token: string
    ): Promise<IResponseReturn<ProjectInvitePublicResponseDto>> {
        return this.projectMemberService.getInviteByToken(token);
    }
}
