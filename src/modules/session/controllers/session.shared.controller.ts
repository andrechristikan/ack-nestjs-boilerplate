import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { SessionSharedListRequestSchema } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { SessionRevokeRequestSchema } from '@modules/session/dtos/request/session.revoke.request.dto';
import type { SessionRevokeRequestDto } from '@modules/session/dtos/request/session.revoke.request.dto';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionGetListCursorUseCase } from '@modules/session/use-cases/session.get-list-cursor.use-case';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

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

    @Doc({
        summary: 'get all user Sessions',
        description: 'orderBy presets: latest (createdAt descending, default).',
    })
    @ResponsePagination('session.list', { schema: SessionResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Query({ schema: SessionSharedListRequestSchema })
        query: SessionSharedListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionGetListCursorUseCase.execute(authContext, query);
    }

    @Doc({ summary: 'revoke user Session' })
    @Response('session.revoke')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/revoke/:sessionId')
    async revoke(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Param('sessionId', { schema: RequestMongoIdSchema })
        sessionId: string,
        @Body({ schema: SessionRevokeRequestSchema })
        body: SessionRevokeRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.sessionRevokeUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            sessionId,
            body
        );
    }
}
