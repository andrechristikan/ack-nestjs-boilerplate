import {
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
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
import { SessionActiveParsePipe } from 'src/modules/session/pipes/session.parse.pipe';
import { SessionDoc } from 'src/modules/session/repository/entities/session.entity';
import { SessionService } from 'src/modules/session/services/session.service';

@ApiTags('modules.shared.session')
@Controller({
    version: '1',
    path: '/session',
})
export class SessionSharedController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly paginationService: PaginationService,
        private readonly sessionService: SessionService
    ) {}

    @SessionSharedListDoc()
    @ResponsePaging('session.list')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtPayload('_id') user: string,
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

        const mapped = await this.sessionService.mapList(sessions);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @SessionSharedRevokeDoc()
    @ResponsePaging('session.revoke')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:session')
    async revoke(
        @Param('session', RequestRequiredPipe, SessionActiveParsePipe)
        session: SessionDoc
    ): Promise<void> {
        const dbSession: ClientSession =
            await this.databaseConnection.startSession();
        dbSession.startTransaction();

        try {
            await this.sessionService.updateRevoke(session, {
                session: dbSession,
            });
            await this.sessionService.deleteLoginSession(session._id);

            await dbSession.commitTransaction();
            await dbSession.endSession();

            return;
        } catch (err: any) {
            await dbSession.abortTransaction();
            await dbSession.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }
}
