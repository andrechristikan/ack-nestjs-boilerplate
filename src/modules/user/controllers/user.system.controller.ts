import {
    PaginationCursorQuery,
    PaginationQueryFilterEqualString,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    UserDefaultAvailableSearch,
    UserDefaultStatus,
} from '@modules/user/constants/user.list.constant';
import {
    UserSystemCheckEmailDoc,
    UserSystemCheckUsernameDoc,
    UserSystemListDoc,
} from '@modules/user/docs/user.system.doc';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumUserStatus } from '@prisma/client';

@ApiTags('modules.system.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSystemController {
    constructor(private readonly userService: UserService) {}

    @UserSystemListDoc()
    @ResponsePaging('user.list')
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: UserDefaultAvailableSearch,
        })
        pagination: IPaginationQueryCursorParams,
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('role')
        role?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('country')
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        return this.userService.getListCursor(
            pagination,
            status,
            role,
            country
        );
    }

    @UserSystemCheckUsernameDoc()
    @Response('user.checkUsername')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/check/username')
    async checkUsername(
        @Body() body: UserCheckUsernameRequestDto
    ): Promise<IResponseReturn<UserCheckUsernameResponseDto>> {
        return this.userService.checkUsername(body);
    }

    @UserSystemCheckEmailDoc()
    @Response('user.checkEmail')
    @ApiKeySystemProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/check/email')
    async checkEmail(
        @Body() body: UserCheckEmailRequestDto
    ): Promise<IResponseReturn<UserCheckEmailResponseDto>> {
        return this.userService.checkEmail(body);
    }
}
