import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { SessionDocParamsId } from '@module/session/constants/session.doc.constant';
import { SessionListResponseDto } from '@module/session/dtos/response/session.list.response.dto';
import { UserDocParamsId } from '@module/user/constants/user.doc.constant';

export function SessionAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user sessions',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<SessionListResponseDto>('session.list', {
            dto: SessionListResponseDto,
        })
    );
}

export function SessionAdminRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke user session',
        }),
        DocRequest({
            params: [...SessionDocParamsId, ...UserDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('session.revoke')
    );
}
