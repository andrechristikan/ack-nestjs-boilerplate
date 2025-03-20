import {
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    SessionSharedListDoc,
    SessionSharedRevokeDoc,
} from 'src/modules/session/docs/session.shared.doc';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { ENUM_SESSION_STATUS_CODE_ERROR } from 'src/modules/session/enums/session.status-code.enum';
import { SessionActiveByUserParsePipe } from 'src/modules/session/pipes/session.parse.pipe';
import { SessionDoc } from 'src/modules/session/repository/entities/session.entity';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';

@ApiTags('modules.shared.session')
@Controller({
    version: '1',
    path: '/session',
})
export class SessionSharedController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly sessionService: SessionService
    ) {}

    @SessionSharedListDoc()
    @ResponsePaging('session.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtPayload('user') user: string,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<SessionListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const sessions: SessionDoc[] = await this.sessionService.findAllByUser(
            user,
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        const total: number = await this.sessionService.getTotalByUser(
            user,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.sessionService.mapList(sessions);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @SessionSharedRevokeDoc()
    @Response('session.revoke')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:session')
    async revoke(
        @Param('session', RequestRequiredPipe, SessionActiveByUserParsePipe)
        session: SessionDoc,
        @AuthJwtPayload('session') sessionFromRequest: string
    ): Promise<void> {
        if (session._id === sessionFromRequest) {
            throw new ForbiddenException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.FORBIDDEN_REVOKE,
                message: 'session.error.forbiddenRevoke',
            });
        }

        await this.sessionService.updateRevoke(session);
    }
}
