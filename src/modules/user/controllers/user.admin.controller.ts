import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { UserService } from '@modules/user/services/user.service';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { ENUM_ROLE_TYPE, ENUM_USER_STATUS } from '@prisma/client';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualString,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_STATUS,
} from '@modules/user/constants/user.list.constant';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import {
    UserAdminCreateDoc,
    UserAdminGetDoc,
    UserAdminListDoc,
    UserAdminUpdatePasswordDoc,
    UserAdminUpdateStatusDoc,
} from '@modules/user/docs/user.admin.doc';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { DatabaseIdResponseDto } from '@common/database/dtos/database.id.dto';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { IRequestUserAgent } from '@common/request/interfaces/request.interface';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(private readonly userService: UserService) {}

    @UserAdminListDoc()
    @ResponsePaging('user.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: USER_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum<ENUM_USER_STATUS>(
            'status',
            USER_DEFAULT_STATUS
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('role')
        role?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('country')
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        return this.userService.getListOffset(
            pagination,
            status,
            role,
            country
        );
    }

    @UserAdminGetDoc()
    @Response('user.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:userId')
    async get(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        return this.userService.getOne(userId);
    }

    @UserAdminCreateDoc()
    @Response('user.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/create')
    async create(
        @Body()
        body: UserCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        return this.userService.createByAdmin(
            body,
            {
                ipAddress,
                userAgent,
            },
            createdBy
        );
    }

    @UserAdminUpdateStatusDoc()
    @Response('user.updateStatus')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:userId/status')
    async updateStatus(
        @Param('userId', RequestRequiredPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @Body() data: UserUpdateStatusRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<void>> {
        return this.userService.updateStatusByAdmin(
            userId,
            data,
            {
                ipAddress,
                userAgent,
            },
            updatedBy
        );
    }

    @UserAdminUpdatePasswordDoc()
    @Response('user.updatePassword')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:userId/password')
    async updatePassword(
        @Param('userId', RequestRequiredPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: IRequestUserAgent
    ): Promise<IResponseReturn<void>> {
        return this.userService.updatePasswordByAdmin(
            userId,
            {
                ipAddress,
                userAgent,
            },
            updatedBy
        );
    }
}
