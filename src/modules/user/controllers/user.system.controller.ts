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
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_POLICY_ROLE_TYPE,
    USER_DEFAULT_STATUS,
} from 'src/modules/user/constants/user.list.constant';
import {
    UserSystemCheckEmailDoc,
    UserSystemCheckMobileNumberDoc,
    UserSystemCheckUsernameDoc,
    UserSystemListDoc,
} from 'src/modules/user/docs/user.system.doc';
import { UserCheckMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.check-mobile-number.dto';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from 'src/modules/user/dtos/request/user.check.request.dto';
import {
    UserCheckResponseDto,
    UserCheckUsernameResponseDto,
} from 'src/modules/user/dtos/response/user.check.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';

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
        @PaginationQueryFilterInEnum(
            'role.type',
            USER_DEFAULT_POLICY_ROLE_TYPE,
            ENUM_POLICY_ROLE_TYPE,
            {
                queryField: 'roleType',
            }
        )
        roleType: Record<string, any>,
        @PaginationQueryFilterEqual('country', {
            queryField: 'country',
        })
        country: Record<string, any>
    ): Promise<IResponsePaging<UserShortResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...roleType,
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
