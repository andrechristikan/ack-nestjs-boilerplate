import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { UserService } from 'src/modules/user/services/user.service';
import { UserSystemListDoc } from 'src/modules/user/docs/user.system.doc';
import { USER_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/user/constants/user.list.constant';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';

@ApiTags('modules.system.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSystemController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly userService: UserService
    ) {}

    @UserSystemListDoc()
    @ResponsePaging('user.list')
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @PaginationQuery({ availableSearch: USER_DEFAULT_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<UserShortResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const users: IUserDoc[] =
            await this.userService.findAllWithRoleAndCountry(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });

        const total: number = await this.userService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        const mapUsers: UserShortResponseDto[] =
            await this.userService.mapShort(users);

        return {
            _pagination: { total, totalPage },
            data: mapUsers,
        };
    }
}
