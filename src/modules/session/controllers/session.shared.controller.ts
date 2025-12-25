import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import {
    SessionSharedListDoc,
    SessionSharedRevokeDoc,
} from '@modules/session/docs/session.shared.doc';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { SessionService } from '@modules/session/services/session.service';
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
    constructor(private readonly sessionService: SessionService) {}

    @SessionSharedListDoc()
    @ResponsePaging('session.list')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableOrderBy: SessionDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        return this.sessionService.getListCursor(userId, pagination);
    }

    @SessionSharedRevokeDoc()
    @ResponsePaging('session.revoke')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('sessionId', RequestRequiredPipe) sessionId: string,
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.sessionService.revoke(userId, sessionId, {
            ipAddress,
            userAgent,
        });
    }
}
