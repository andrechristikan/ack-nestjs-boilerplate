import {
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
import {
    IUserDoc,
    IUserPasswordHistoryDoc,
    IUserStateHistoryDoc,
} from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_BLOCKED,
    USER_DEFAULT_STATUS,
} from 'src/modules/user/constants/user.list.constant';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import {
    PaginationQuery,
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
    UserAdminGetLoginHistoryListDoc,
    UserAdminGetPasswordHistoryListDoc,
    UserAdminGetStateHistoryListDoc,
    UserAdminInactiveDoc,
    UserAdminListDoc,
    UserAdminUpdateDoc,
    UserAdminUpdatePasswordDoc,
} from 'src/modules/user/docs/user.admin.doc';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/common/auth/decorators/auth.jwt.decorator';
import {
    ENUM_USER_PASSWORD_TYPE,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
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
import { CountryService } from 'src/modules/country/services/country.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/constants/country.status-code.constant';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserLoginHistoryService } from 'src/modules/user/services/user-login-history.service';
import { UserStateHistoryService } from 'src/modules/user/services/user-state-history.service';
import { UserPasswordHistoryService } from 'src/modules/user/services/user-password-history.service';
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';
import { UserPasswordHistoryListResponseDto } from 'src/modules/user/dtos/response/user-password-history.list.response.dto';
import { UserLoginHistoryListResponseDto } from 'src/modules/user/dtos/response/user-login-history.list.response.dto';
import { UserLoginHistoryDoc } from 'src/modules/user/repository/entities/user-login-history.entity';
import { UserStatusPipe } from 'src/modules/user/pipes/user.status.pipe';

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
        private readonly userStateHistoryService: UserStateHistoryService,
        private readonly userPasswordHistoryService: UserPasswordHistoryService,
        private readonly userLoginHistoryService: UserLoginHistoryService,
        private readonly countryService: CountryService
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
            availableSearch: USER_DEFAULT_AVAILABLE_SEARCH,
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
        @PaginationQueryFilterEqual('role')
        role: Record<string, any>,
        @PaginationQueryFilterEqual('country')
        country: Record<string, any>
    ): Promise<IResponsePaging<UserListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...status,
            ...blocked,
            ...role,
            ...country,
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
        const userWithRole: IUserDoc = await this.userService.join(user);
        const mapped: UserProfileResponseDto =
            await this.userService.mapProfile(userWithRole);

        return { data: mapped };
    }

    @UserAdminGetStateHistoryListDoc()
    @ResponsePaging('user.stateHistoryList')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/get/:user/state/history')
    async stateHistoryList(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<UserStateHistoryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const userHistories: IUserStateHistoryDoc[] =
            await this.userStateHistoryService.findAllByUser(user._id, find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        const total: number = await this.userStateHistoryService.getTotalByUser(
            user._id,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped =
            await this.userStateHistoryService.mapList(userHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @UserAdminGetPasswordHistoryListDoc()
    @ResponsePaging('user.passwordHistoryList')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/get/:user/password/history')
    async passwordHistoryList(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<UserPasswordHistoryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const userHistories: IUserPasswordHistoryDoc[] =
            await this.userPasswordHistoryService.findAllByUser(
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
        const total: number =
            await this.userPasswordHistoryService.getTotalByUser(
                user._id,
                find
            );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped =
            await this.userPasswordHistoryService.mapList(userHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @UserAdminGetLoginHistoryListDoc()
    @ResponsePaging('user.loginHistoryList')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/get/:user/login/history')
    async loginHistoryList(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<UserLoginHistoryListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };

        const userHistories: UserLoginHistoryDoc[] =
            await this.userLoginHistoryService.findAllByUser(user._id, find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        const total: number = await this.userLoginHistoryService.getTotalByUser(
            user._id,
            find
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped =
            await this.userLoginHistoryService.mapList(userHistories);

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
        { email, role, name, country }: UserCreateRequestDto,
        @AuthJwtPayload('_id') _id: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const promises: Promise<any>[] = [
            this.roleService.findOneById(role),
            this.userService.existByEmail(email),
            this.countryService.findOneActiveById(country),
        ];

        const [checkRole, emailExist, checkCountry] =
            await Promise.all(promises);

        if (!checkRole) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        }

        const passwordString = await this.authService.createPasswordRandom();
        const password: IAuthPassword =
            await this.authService.createPassword(passwordString);

        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const created = await this.userService.create(
                {
                    email,
                    country,
                    role,
                    name,
                },
                password,
                ENUM_USER_SIGN_UP_FROM.ADMIN,
                { session }
            );
            await this.userStateHistoryService.createCreated(
                created,
                created._id,
                {
                    session,
                }
            );
            await this.userPasswordHistoryService.createByAdmin(
                created,
                {
                    by: _id,
                    type: ENUM_USER_PASSWORD_TYPE.TEMPORARY_PASSWORD,
                },
                {
                    session,
                }
            );

            await this.emailService.sendWelcome(created);
            await this.emailService.sendTempPassword(created, {
                password: passwordString,
                expiredAt: password.passwordExpired,
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

    @UserAdminUpdateDoc()
    @Response('user.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyPublicProtected()
    @Put('/update/:user')
    async update(
        @Param(
            'user',
            RequestRequiredPipe,
            UserParsePipe,
            UserNotSelfPipe,
            new UserStatusPipe([ENUM_USER_STATUS.ACTIVE])
        )
        user: UserDoc,
        @Body() { name, country }: UserUpdateRequestDto
    ): Promise<void> {
        const checkCountry =
            await this.countryService.findOneActiveById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'country.error.notFound',
            });
        }

        await this.userService.update(user, { name, country });
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
            new UserStatusPipe([ENUM_USER_STATUS.ACTIVE])
        )
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.inactive(user, { session });
            await this.userStateHistoryService.createInactive(user, _id, {
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
            new UserStatusPipe([ENUM_USER_STATUS.INACTIVE])
        )
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.active(user, { session });
            await this.userStateHistoryService.createActive(user, _id, {
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
            new UserStatusPipe([
                ENUM_USER_STATUS.INACTIVE,
                ENUM_USER_STATUS.ACTIVE,
            ])
        )
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.blocked(user, { session });
            await this.userStateHistoryService.createBlocked(user, _id, {
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
        @Param('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserDoc,
        @AuthJwtPayload('_id') _id: string
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            const passwordString =
                await this.authService.createPasswordRandom();
            const password = await this.authService.createPassword(
                passwordString,
                { temporary: true }
            );
            user = await this.userService.updatePassword(user, password, {
                session,
            });
            user = await this.userService.resetPasswordAttempt(user, {
                session,
            });
            await this.userPasswordHistoryService.createByAdmin(
                user,
                {
                    by: _id,
                    type: ENUM_USER_PASSWORD_TYPE.CHANGE_PASSWORD,
                },
                {
                    session,
                }
            );

            await this.emailService.sendTempPassword(user, {
                password: passwordString,
                expiredAt: password.passwordExpired,
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
