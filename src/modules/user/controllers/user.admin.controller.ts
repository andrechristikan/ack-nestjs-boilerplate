import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
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
    UserAdminCreateDoc,
    UserAdminGetDoc,
    UserAdminGetHistoryListDoc,
    UserAdminGetPasswordListDoc,
    UserAdminInactiveDoc,
    UserAdminListDoc,
    UserAdminUpdatePasswordDoc,
} from 'src/modules/user/docs/user.admin.doc';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';
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
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { EmailService } from 'src/modules/email/services/email.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { UserHistoryService } from 'src/modules/user/services/user-history.service';
import { UserPasswordService } from 'src/modules/user/services/user-password.service';
import { UserUpdatePasswordRequestDto } from 'src/modules/user/dtos/request/user.update-password.request.dto';
import { SettingService } from 'src/modules/setting/services/setting.service';
import { UserHistoryDoc } from 'src/modules/user/repository/entities/user-history.entity';
import { UserPasswordDoc } from 'src/modules/user/repository/entities/user-password.entity';
import { UserHistoryListResponseDto } from 'src/modules/user/dtos/response/user-history.list.response.dto';
import { UserPasswordListResponseDto } from 'src/modules/user/dtos/response/user-password.list.response.dto';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly emailService: EmailService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly userHistoryService: UserHistoryService,
        private readonly userPasswordService: UserPasswordService,
        private readonly settingService: SettingService
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
            ...role,
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

    @UserAdminGetHistoryListDoc()
    @ResponsePaging('user.listHistory')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/get/:user/history/list')
    async listHistory(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<UserHistoryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const userHistories: UserHistoryDoc[] =
            await this.userHistoryService.findAllByUser(user._id, find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        const total: number = await this.userHistoryService.getTotalByUser(
            user._id,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = await this.userHistoryService.mapList(userHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @UserAdminGetPasswordListDoc()
    @ResponsePaging('user.listPassword')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/get/:user/password/list')
    async listPassword(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<UserPasswordListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const userHistories: UserPasswordDoc[] =
            await this.userPasswordService.findAllByUser(user._id, find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        const total: number = await this.userPasswordService.getTotalByUser(
            user._id,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = await this.userPasswordService.mapList(userHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @UserAdminCreateDoc()
    @Response('user.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @Post('/create')
    async create(
        @Body()
        {
            email,
            mobileNumber,
            role,
            firstName,
            lastName,
            password: passwordString,
        }: UserCreateRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const checkMobileNumberAllowed =
            await this.settingService.checkMobileNumberAllowed(mobileNumber);
        if (!checkMobileNumberAllowed) {
            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_NOT_ALLOWED_ERROR,
                message: 'user.error.mobileNumberNotAllowed',
            });
        }

        const promises: Promise<any>[] = [
            this.roleService.findOneById(role),
            this.userService.existByEmail(email),
        ];

        if (mobileNumber) {
            promises.push(this.userService.existByMobileNumber(mobileNumber));
        }

        const [checkRole, emailExist, mobileNumberExist] =
            await Promise.all(promises);

        if (!checkRole) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (mobileNumberExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        const password: IAuthPassword =
            await this.authService.createPassword(passwordString);

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const created = await this.userService.create(
                {
                    email,
                    mobileNumber,
                    role,
                    firstName,
                    lastName,
                    password: passwordString,
                },
                password,
                ENUM_USER_SIGN_UP_FROM.ADMIN,
                { session }
            );
            await this.userHistoryService.createCreatedByUser(
                created,
                created._id,
                {
                    session,
                }
            );
            await this.userPasswordService.createByUser(created, { session });

            await this.emailService.sendWelcome({
                email,
                name:
                    firstName && lastName ? `${firstName} ${lastName}` : email,
            });

            await session.commitTransaction();
            await session.endSession();

            return {
                data: { _id: created._id },
            };
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
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
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.inactive(user, { session });
            await this.userHistoryService.createInactiveByUser(user, _id, {
                session,
            });

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
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
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.active(user, { session });
            await this.userHistoryService.createActiveByUser(user, _id, {
                session,
            });

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
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
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.blocked(user, { session });
            await this.userHistoryService.createBlockedByUser(user, _id, {
                session,
            });

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }

    @UserAdminUpdatePasswordDoc()
    @Response('user.updatePassword')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Put('/update/:user/password')
    async updatePassword(
        @Param(
            'user',
            RequestRequiredPipe,
            UserParsePipe,
            UserNotSelfPipe,
            UserStatusInactivePipe
        )
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string,
        @Body() { password: passwordString }: UserUpdatePasswordRequestDto
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const password =
                await this.authService.createPassword(passwordString);
            user = await this.userService.updatePassword(user, password, {
                session,
            });
            user = await this.userService.resetPasswordAttempt(user, {
                session,
            });
            await this.userPasswordService.createByUser(user, {
                session,
            });

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }
}
