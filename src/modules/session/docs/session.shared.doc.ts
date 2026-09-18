import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { SessionCursorAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import { SessionDocParamsId } from '@modules/session/constants/session.doc.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

export function SessionSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user Sessions',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponsePaging<SessionResponseDto>('session.list', {
            schema: SessionResponseSchema,
            availableOrderBy: SessionCursorAvailableOrderBy,
            type: EnumPaginationType.cursor,
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
        DocGuard({ termPolicy: true }),
        DocResponse('session.revoke')
    );
}
