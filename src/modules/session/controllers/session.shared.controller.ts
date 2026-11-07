import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { SessionSharedListRequestSchema } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionGetListCursorUseCase } from '@modules/session/use-cases/session.get-list-cursor.use-case';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';
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
    constructor(
        private readonly sessionGetListCursorUseCase: SessionGetListCursorUseCase,
        private readonly sessionRevokeUseCase: SessionRevokeUseCase
    ) {}

    @Doc({ summary: 'get all user Sessions' })
    @ResponsePagination('session.list', { schema: SessionResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: SessionSharedListRequestSchema })
        query: SessionSharedListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionGetListCursorUseCase.execute(userId, query);
    }

    @Doc({ summary: 'revoke user Session' })
    @Response('session.revoke')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('sessionId', { schema: RequestMongoIdSchema })
        sessionId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.sessionRevokeUseCase.execute(userId, sessionId);
    }
}
