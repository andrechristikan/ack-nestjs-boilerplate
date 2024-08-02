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
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/constants/policy.enum.constant';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { EmailService } from 'src/modules/email/services/email.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ClientSession, Connection } from 'mongoose';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/constants/app.status-code.constant';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/constants/country.status-code.constant';
import { CountryService } from 'src/modules/country/services/country.service';
import { UserLoginHistoryService } from 'src/modules/user/services/user-login-history.service';
import { UserStateHistoryService } from 'src/modules/user/services/user-state-history.service';
import { UserPasswordHistoryService } from 'src/modules/user/services/user-password-history.service';
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
import {
    ENUM_USER_PASSWORD_TYPE,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';
import { UserPasswordHistoryListResponseDto } from 'src/modules/user/dtos/response/user-password-history.list.response.dto';
import { UserService } from 'src/modules/user/services/user.service';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_STATUS,
} from 'src/modules/user/constants/user.list.constant';
import {
    IUserDoc,
    IUserPasswordHistoryDoc,
    IUserStateHistoryDoc,
} from 'src/modules/user/interfaces/user.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserLoginHistoryListResponseDto } from 'src/modules/user/dtos/response/user-login-history.list.response.dto';
import { UserLoginHistoryDoc } from 'src/modules/user/repository/entities/user-login-history.entity';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import { UserStatusPipe } from 'src/modules/user/pipes/user.status.pipe';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';

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
    @ApiKeyProtected()
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
        @PaginationQueryFilterEqual('role')
        role: Record<string, any>,
        @PaginationQueryFilterEqual('country')
        country: Record<string, any>
    ): Promise<IResponsePaging<UserListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...status,
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
    @ApiKeyProtected()
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
    @ApiKeyProtected()
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
    @ApiKeyProtected()
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
    @ApiKeyProtected()
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
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
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

            await this.emailService.sendWelcomeAdmin(
                {
                    email: created.email,
                    name: created.name,
                },
                {
                    passwordExpiredAt: password.passwordExpired,
                    password: passwordString,
                }
            );

            await session.commitTransaction();
            await session.endSession();

            return {
                data: { _id: created._id },
            };
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
    @ApiKeyProtected()
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
        @Body() { name, country, role }: UserUpdateRequestDto
    ): Promise<void> {
        const userRole = await this.roleService.findOneActiveById(user.role);
        const checkRole = await this.roleService.findOneActiveByIdAndType(
            role,
            userRole.type
        );
        if (!checkRole) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const checkCountry =
            await this.countryService.findOneActiveById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        await this.userService.update(user, { name, country, role });
    }

    @UserAdminInactiveDoc()
    @Response('user.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
    @ApiKeyProtected()
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
    @ApiKeyProtected()
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
    @ApiKeyProtected()
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
                {
                    temporary: true,
                }
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

            await this.emailService.sendTempPassword(
                {
                    email: user.email,
                    name: user.name,
                },
                {
                    passwordExpiredAt: password.passwordExpired,
                    password: passwordString,
                }
            );

            await session.commitTransaction();
            await session.endSession();

            return;
        } catch (err: any) {
            await session.abortTransaction();
            await session.endSession();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }
}
