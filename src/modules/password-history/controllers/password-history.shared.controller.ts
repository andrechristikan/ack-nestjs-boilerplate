import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { PasswordHistorySharedListDoc } from 'src/modules/password-history/docs/password-history.shared.doc';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';
import { IPasswordHistoryDoc } from 'src/modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';

@ApiTags('modules.shared.passwordHistory')
@Controller({
    version: '1',
    path: '/password-history',
})
export class PasswordHistorySharedController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    @PasswordHistorySharedListDoc()
    @ResponsePaging('passwordHistory.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtPayload('user') user: string,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<PasswordHistoryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const passwordHistories: IPasswordHistoryDoc[] =
            await this.passwordHistoryService.findAllByUser(user, find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        const total: number = await this.passwordHistoryService.getTotalByUser(
            user,
            find
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
