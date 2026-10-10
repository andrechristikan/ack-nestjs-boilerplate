import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { SessionSharedListRequestSchema } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';

import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.session')
@Controller({
    version: '1',
    path: '/user/session',
})
export class SessionSharedController {
    constructor(private readonly sessionHttpService: SessionHttpService) {}

    @Doc({ summary: 'get all user Sessions' })
    @ResponsePagination('session.list', { schema: SessionResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: SessionSharedListRequestSchema })
        query: SessionSharedListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionHttpService.getListCursor(userId, query);
    }

    @Doc({ summary: 'revoke user Session' })
    @Response('session.revoke')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('sessionId', { schema: RequestUuidSchema })
        sessionId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<void> {
        await this.sessionHttpService.revoke(userId, sessionId);
    }
}
