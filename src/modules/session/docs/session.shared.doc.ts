import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { SessionDocParamsId } from '@modules/session/constants/session.doc.constant';
import { ENUM_PAGINATION_TYPE } from '@common/pagination/enums/pagination.enum';

export function SessionSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user Sessions',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<SessionResponseDto>('session.list', {
            dto: SessionResponseDto,
            type: ENUM_PAGINATION_TYPE.CURSOR,
        })
    );
}

export function SessionSharedRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke user Session',
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
