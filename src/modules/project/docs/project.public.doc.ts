import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ProjectInvitePublicResponseDto } from '@modules/project/dtos/response/project-invite-public.response.dto';
import { applyDecorators } from '@nestjs/common';

export function ProjectPublicGetInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get project invite details by token',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
        }),
        DocResponse<ProjectInvitePublicResponseDto>('project.invite.get', {
            dto: ProjectInvitePublicResponseDto,
        })
    );
}
