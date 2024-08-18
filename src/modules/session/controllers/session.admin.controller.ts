import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { SessionAdminListDoc } from 'src/modules/session/docs/session.admin.doc';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { SessionDoc } from 'src/modules/session/repository/entities/session.entity';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@ApiTags('modules.admin.session')
@Controller({
    version: '1',
    path: '/user/get/:user/session',
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

        const mapped = await this.sessionService.mapList(sessions);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }
}
