import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { SessionCursorAvailableOrderBy } from '@modules/session/constants/session.list.constant';
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
        DocGuard({ termPolicy: true, user: true }),
        DocResponsePagination<SessionResponseDto>('session.list', {
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
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocResponse('session.revoke')
    );
}
