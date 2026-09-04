import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidUuidPipe } from '@common/request/pipes/request.is-valid-uuid.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { SessionCursorAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import {
    SessionSharedListDoc,
    SessionSharedRevokeDoc,
} from '@modules/session/docs/session.shared.doc';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import { ISession } from '@modules/session/interfaces/session.interface';
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.session')
@Controller({
    version: '1',
    path: '/user/session',
})
export class SessionSharedController {
    constructor(private readonly sessionHttpService: SessionHttpService) {}

    @SessionSharedListDoc()
    @ResponsePaging('session.list', { schema: SessionResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableOrderBy: SessionCursorAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.sessionHttpService.getListCursor(userId, pagination);
    }

    @SessionSharedRevokeDoc()
    @Response('session.revoke')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('sessionId', RequestRequiredPipe, RequestIsValidUuidPipe)
        sessionId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<void> {
        await this.sessionHttpService.revoke(userId, sessionId);
    }
}
