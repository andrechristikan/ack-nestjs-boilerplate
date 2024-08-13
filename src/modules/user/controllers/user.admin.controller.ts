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
} from 'src/modules/policy/enums/policy.enum';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ClientSession, Connection } from 'mongoose';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
import {
    UserAdminActiveDoc,
    UserAdminBlockedDoc,
    UserAdminCreateDoc,
    UserAdminGetDoc,
    UserAdminInactiveDoc,
    UserAdminListDoc,
    UserAdminUpdateDoc,
} from 'src/modules/user/docs/user.admin.doc';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/enums/user.enum';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserService } from 'src/modules/user/services/user.service';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_STATUS,
} from 'src/modules/user/constants/user.list.constant';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import { UserStatusPipe } from 'src/modules/user/pipes/user.status.pipe';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_EMAIL } from 'src/modules/email/enums/email.enum';
import { Queue } from 'bullmq';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';
import { WorkerQueue } from 'src/worker/decorators/worker.decorator';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        @WorkerQueue(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
        private readonly emailQueue: Queue,
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
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
        { email, role, name, country }: UserCreateRequestDto
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

            this.emailQueue.add(
                ENUM_EMAIL.WELCOME_ADMIN,
                {
                    email: created.email,
                    name: created.name,
                    passwordExpiredAt: password.passwordExpired,
                    password: passwordString,
                },
                {
                    debounce: {
                        id: `${ENUM_EMAIL.WELCOME_ADMIN}-${created._id}`,
                        ttl: 1000,
                    },
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
        const checkRole = await this.roleService.findOneActiveById(role);
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
        user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.inactive(user, { session });

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
        user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.active(user, { session });

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
        user: UserDoc
    ): Promise<void> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        try {
            await this.userService.blocked(user, { session });

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
