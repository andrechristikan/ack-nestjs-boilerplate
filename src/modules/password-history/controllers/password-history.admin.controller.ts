import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@module/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@module/auth/decorators/auth.jwt.decorator';
import { PasswordHistoryAdminListDoc } from '@module/password-history/docs/password-history.admin.doc';
import { PasswordHistoryListResponseDto } from '@module/password-history/dtos/response/password-history.list.response.dto';
import { IPasswordHistoryDoc } from '@module/password-history/interfaces/password-history.interface';
import { PasswordHistoryService } from '@module/password-history/services/password-history.service';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@module/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@module/policy/enums/policy.enum';
import { UserProtected } from '@module/user/decorators/user.decorator';
import { UserParsePipe } from '@module/user/pipes/user.parse.pipe';
import { UserDoc } from '@module/user/repository/entities/user.entity';

@ApiTags('modules.admin.passwordHistory')
@Controller({
    version: '1',
    path: '/password-history/:user',
})
export class PasswordHistoryAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    @PasswordHistoryAdminListDoc()
    @ResponsePaging('passwordHistory.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ACTIVITY,
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
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<PasswordHistoryListResponseDto>> {
        const passwordHistories: IPasswordHistoryDoc[] =
            await this.passwordHistoryService.findAllByUser(
                user._id,
                {},
                {
                    paging: {
                        limit: _limit,
                        offset: _offset,
                    },
                    order: _order,
                }
            );
        const total: number = await this.passwordHistoryService.getTotalByUser(
            user._id,
            {}
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.passwordHistoryService.mapList(passwordHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }
}
