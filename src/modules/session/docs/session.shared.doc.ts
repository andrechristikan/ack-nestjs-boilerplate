import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { SessionDocParamsId } from '@module/session/constants/session.doc.constant';
import { SessionListResponseDto } from '@module/session/dtos/response/session.list.response.dto';

export function SessionSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user sessions',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<SessionListResponseDto>('session.list', {
            dto: SessionListResponseDto,
        })
    );
}

export function SessionSharedRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke user session',
        }),
        DocRequest({
            params: SessionDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('session.revoke')
    );
}
