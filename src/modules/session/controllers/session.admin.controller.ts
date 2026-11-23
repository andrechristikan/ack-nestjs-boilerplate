import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { SessionAdminListRequestSchema } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
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
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionGetListOffsetByAdminUseCase } from '@modules/session/use-cases/session.get-list-offset-by-admin.use-case';
import { SessionRevokeByAdminUseCase } from '@modules/session/use-cases/session.revoke-by-admin.use-case';
import { SessionRevokeAllByAdminUseCase } from '@modules/session/use-cases/session.revoke-all-by-admin.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.admin.user.session')
@Controller({
    version: '1',
    path: '/user/:userId/session',
})
export class SessionAdminController {
    constructor(
        private readonly sessionGetListOffsetByAdminUseCase: SessionGetListOffsetByAdminUseCase,
        private readonly sessionRevokeByAdminUseCase: SessionRevokeByAdminUseCase,
        private readonly sessionRevokeAllByAdminUseCase: SessionRevokeAllByAdminUseCase
    ) {}

    @Doc({ summary: 'admin get all user Sessions' })
    @ResponsePagination('session.list', { schema: SessionResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.Session,
            action: [EnumPolicyAction.read],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Query({ schema: SessionAdminListRequestSchema })
        query: SessionAdminListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionGetListOffsetByAdminUseCase.execute(
            policyContext,
            userId,
            query
        );
    }

    @Doc({ summary: 'admin revoke user Session' })
    @Response('session.revoke')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.Session,
            action: [EnumPolicyAction.read, EnumPolicyAction.delete],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:sessionId')
    async revoke(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Param('sessionId', { schema: RequestUuidSchema })
        sessionId: string
    ): Promise<IResponseReturn<void>> {
        return this.sessionRevokeByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            userId,
            sessionId
        );
    }

    @Doc({ summary: 'admin revoke all user Sessions' })
    @Response('session.revokeAll')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.Session,
            action: [EnumPolicyAction.read, EnumPolicyAction.delete],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke-all')
    async revokeAll(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<void>> {
        return this.sessionRevokeAllByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            userId
        );
    }
}
