import {
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import {
    SessionAdminListDoc,
    SessionAdminRevokeDoc,
} from '@modules/session/docs/session.admin.doc';
import { SessionListResponseDto } from '@modules/session/dtos/response/session.list.response.dto';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
import { SessionActiveParsePipe } from '@modules/session/pipes/session.parse.pipe';
import { SessionDoc } from '@modules/session/repository/entities/session.entity';
import { SessionService } from '@modules/session/services/session.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { UserNotSelfPipe } from '@modules/user/pipes/user.not-self.pipe';
import { UserParsePipe } from '@modules/user/pipes/user.parse.pipe';
import { UserDoc } from '@modules/user/repository/entities/user.entity';

@ApiTags('modules.admin.session')
@Controller({
    version: '1',
    path: '/session/:user',
})
export class SessionAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly sessionService: SessionService
    ) {}

    @SessionAdminListDoc()
    @ResponsePaging('session.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SESSION,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<SessionListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const sessions: SessionDoc[] = await this.sessionService.findAllByUser(
            user._id,
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
            user._id,
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

    @SessionAdminRevokeDoc()
    @Response('session.revoke')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:session')
    async revoke(
        @Param('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserDoc,
        @Param('session', RequestRequiredPipe, SessionActiveParsePipe)
        session: SessionDoc
    ): Promise<void> {
        if (user._id !== session.user) {
            throw new NotFoundException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        await this.sessionService.updateRevoke(session);
    }
}
