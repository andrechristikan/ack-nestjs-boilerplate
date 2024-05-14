import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';
import {
    USER_DEFAULT_AVAILABLE_ORDER_BY,
    USER_DEFAULT_BLOCKED,
    USER_DEFAULT_ORDER_BY,
    USER_DEFAULT_STATUS,
} from 'src/modules/user/constants/user.list.constant';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import {
    PaginationQuery,
    PaginationQueryFilterDate,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/common/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import {
    UserAdminActiveDoc,
    UserAdminBlockedDoc,
    UserAdminGetDoc,
    UserAdminInactiveDoc,
    UserAdminListDoc,
} from 'src/modules/user/docs/user.admin.doc';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import {
    UserStatusActivePipe,
    UserStatusInactivePipe,
} from 'src/modules/user/pipes/user.status.pipe';
import { UserNotBlockedPipe } from 'src/modules/user/pipes/user.blocked.pipe';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly userService: UserService
    ) {}

    @UserAdminListDoc()
    @ResponsePaging('user.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            defaultOrderBy: USER_DEFAULT_ORDER_BY,
            availableOrderBy: USER_DEFAULT_AVAILABLE_ORDER_BY,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'status',
            USER_DEFAULT_STATUS,
            ENUM_USER_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterInBoolean('blocked', USER_DEFAULT_BLOCKED)
        blocked: Record<string, any>,
        @PaginationQueryFilterDate('startDate', {
            raw: true,
        })
        startDate: Record<string, any>,
        @PaginationQueryFilterDate('endDate', {
            raw: true,
        })
        endDate: Record<string, any>,
        @PaginationQueryFilterEqual('role')
        role: Record<string, any>
    ): Promise<IResponsePaging<UserListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...status,
            ...blocked,
            role: role._id,
        };

        if (startDate && endDate) {
            find.signUpDate = {
                $gte: startDate.startDate,
                $lte: endDate.endDate,
            };
        }

        const users: IUserDoc[] = await this.userService.findAllWithRoles(
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        const total: number = await this.userService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = await this.userService.mapList(users);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @UserAdminGetDoc()
    @Response('user.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/get/:user')
    async get(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc
    ): Promise<IResponse<UserProfileResponseDto>> {
        const userWithRole: IUserDoc =
            await this.userService.joinWithRole(user);
        const mapped: UserProfileResponseDto =
            await this.userService.mapProfile(userWithRole);

        return { data: mapped };
    }

    @UserAdminInactiveDoc()
    @Response('user.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/update/:user/inactive')
    async inactive(
        @Param(
            'user',
            RequestRequiredPipe,
            UserParsePipe,
            UserNotSelfPipe,
            UserStatusActivePipe
        )
        user: UserDoc
    ): Promise<void> {
        await this.userService.inactive(user);

        return;
    }

    @UserAdminActiveDoc()
    @Response('user.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/update/:user/active')
    async active(
        @Param(
            'user',
            RequestRequiredPipe,
            UserParsePipe,
            UserNotSelfPipe,
            UserStatusInactivePipe
        )
        user: UserDoc
    ): Promise<void> {
        await this.userService.active(user);

        return;
    }

    @UserAdminBlockedDoc()
    @Response('user.blocked')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Patch('/update/:user/blocked')
    async blocked(
        @Param(
            'user',
            RequestRequiredPipe,
            UserParsePipe,
            UserNotSelfPipe,
            UserNotBlockedPipe
        )
        user: UserDoc
    ): Promise<void> {
        await this.userService.blocked(user);

        return;
    }
}
