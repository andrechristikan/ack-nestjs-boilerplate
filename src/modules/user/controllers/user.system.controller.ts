import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterIn,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@module/api-key/decorators/api-key.decorator';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_STATUS,
} from '@module/user/constants/user.list.constant';
import {
    UserSystemCheckEmailDoc,
    UserSystemCheckMobileNumberDoc,
    UserSystemCheckUsernameDoc,
    UserSystemListDoc,
} from '@module/user/docs/user.system.doc';
import { UserCheckMobileNumberRequestDto } from '@module/user/dtos/request/user.check-mobile-number.dto';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@module/user/dtos/request/user.check.request.dto';
import {
    UserCheckResponseDto,
    UserCheckUsernameResponseDto,
} from '@module/user/dtos/response/user.check.response.dto';
import { UserShortResponseDto } from '@module/user/dtos/response/user.short.response.dto';
import { ENUM_USER_STATUS } from '@module/user/enums/user.enum';
import { IUserEntity } from '@module/user/interfaces/user.interface';
import { UserService } from '@module/user/services/user.service';

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
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'status',
            USER_DEFAULT_STATUS,
            ENUM_USER_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterIn('role')
        role: Record<string, any>,
        @PaginationQueryFilterEqual('country', {
            queryField: 'country',
        })
        country: Record<string, any>
    ): Promise<IResponsePaging<UserShortResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...role,
            ...country,
            ...status,
        };

        const users: IUserEntity[] =
            await this.userService.findAllWithRoleAndCountry(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });

        const total: number =
            await this.userService.getTotalWithRoleAndCountry(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        const mapUsers: UserShortResponseDto[] =
            this.userService.mapShort(users);

        return {
            _pagination: { total, totalPage },
            data: mapUsers,
        };
    }

    @UserSystemCheckMobileNumberDoc()
    @Response('user.checkMobileNumber')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/check/mobile-number')
    async checkMobileNumber(
        @Body() { number }: UserCheckMobileNumberRequestDto
    ): Promise<IResponse<UserCheckResponseDto>> {
        const user = await this.userService.findOneByMobileNumber(number);
        const mapped = user ? this.userService.mapCensor(user) : undefined;

        return {
            data: {
                exist: !!user,
                user: mapped,
            },
        };
    }

    @UserSystemCheckUsernameDoc()
    @Response('user.checkUsername')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/check/username')
    async checkUsername(
        @Body() { username }: UserCheckUsernameRequestDto
    ): Promise<IResponse<UserCheckUsernameResponseDto>> {
        const checkUsername = this.userService.checkUsernamePattern(username);
        const checkBadWord =
            await this.userService.checkUsernameBadWord(username);

        const user = await this.userService.findOneByUsername(username);
        const mapped = user ? this.userService.mapCensor(user) : undefined;

        return {
            data: {
                badWord: checkBadWord,
                exist: !!user,
                pattern: checkUsername,
                user: mapped,
            },
        };
    }

    @UserSystemCheckEmailDoc()
    @Response('user.checkEmail')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/check/email')
    async checkEmail(
        @Body() { email }: UserCheckEmailRequestDto
    ): Promise<IResponse<UserCheckResponseDto>> {
        const user = await this.userService.findOneByEmail(email);
        const mapped = user ? this.userService.mapCensor(user) : undefined;

        return {
            data: { exist: !!user, user: mapped },
        };
    }
}
