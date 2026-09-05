import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import {
    SessionResponseDto,
    SessionResponseSchema,
} from '@modules/session/dtos/response/session.response.dto';
import {
    SessionDocParamsId,
    SessionDocQueryList,
} from '@modules/session/constants/session.doc.constant';
import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';

export function SessionAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all user Sessions',
        }),
        DocRequest({
            params: UserDocParamsId,
            queries: SessionDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<SessionResponseDto>('session.list', {
            schema: SessionResponseSchema,
            availableOrderBy: SessionDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function SessionAdminRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin revoke user Session',
        }),
        DocRequest({
            params: [...UserDocParamsId, ...SessionDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('session.revoke')
    );
}
