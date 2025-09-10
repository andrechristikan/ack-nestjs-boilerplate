import { Controller, Get, Param } from '@nestjs/common';
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
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
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
    UserAdminGetDoc,
    UserAdminListDoc,
} from '@modules/user/docs/user.admin.doc';

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
        const results: IResponsePagingReturn<UserListResponseDto> =
            await this.userService.getList(pagination, status, role, country);

        return results;
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
        const user: UserProfileResponseDto =
            await this.userService.getOne(userId);

        return { data: user };
    }

    // @UserAdminCreateDoc()
    // @Response('user.create')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.USER,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @Post('/create')
    // async create(
    //     @AuthJwtPayload('user') createBy: string,
    //     @Body()
    //     { email, role, name, country, gender }: UserCreateRequestDto
    // ): Promise<IResponse<DatabaseIdResponseDto>> {
    //     const promises: Promise<any>[] = [
    //         this.roleService.findOneById(role),
    //         this.userService.existByEmail(email),
    //         this.countryService.findOneById(country),
    //     ];

    //     const [checkRole, emailExist, checkCountry] =
    //         await Promise.all(promises);

    //     if (!checkRole) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
    //             message: 'role.error.notFound',
    //         });
    //     } else if (!checkCountry) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
    //             message: 'country.error.notFound',
    //         });
    //     } else if (emailExist) {
    //         throw new ConflictException({
    //             statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
    //             message: 'user.error.emailExist',
    //         });
    //     }

    //     const passwordString = this.authService.createPasswordRandom();
    //     const password: IAuthPassword = this.authService.createPassword(
    //         passwordString,
    //         {
    //             temporary: true,
    //         }
    //     );

    //     const session: ClientSession =
    //         await this.databaseService.createTransaction();

    //     try {
    //         const created = await this.userService.create(
    //             {
    //                 email,
    //                 country,
    //                 role,
    //                 name,
    //                 gender,
    //             },
    //             password,
    //             ENUM_USER_SIGN_UP_FROM.ADMIN,
    //             { session }
    //         );

    //         const verification =
    //             await this.verificationService.createEmailByUser(created, {
    //                 session,
    //             });
    //         await this.passwordHistoryService.createByAdmin(
    //             created,
    //             {
    //                 by: createBy,
    //                 type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
    //             },
    //             { session }
    //         );
    //         await this.activityService.createByAdmin(
    //             created,
    //             {
    //                 by: createBy,
    //                 description: this.messageService.setMessage(
    //                     'activity.user.createByAdmin'
    //                 ),
    //             },
    //             { session }
    //         );

    //         await Promise.all([
    //             this.emailQueue.add(
    //                 ENUM_SEND_EMAIL_PROCESS.CREATE,
    //                 {
    //                     send: { email: created.email, name: created.name },
    //                     data: {
    //                         passwordExpiredAt: password.passwordExpired,
    //                         password: passwordString,
    //                     },
    //                 },
    //                 {
    //                     debounce: {
    //                         id: `${ENUM_SEND_EMAIL_PROCESS.CREATE}-${created._id}`,
    //                         ttl: 1000,
    //                     },
    //                 }
    //             ),
    //             this.emailQueue.add(
    //                 ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
    //                 {
    //                     send: { email, name },
    //                     data: {
    //                         otp: verification.otp,
    //                         expiredAt: verification.expiredDate,
    //                         reference: verification.reference,
    //                     },
    //                 },
    //                 {
    //                     debounce: {
    //                         id: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${created._id}`,
    //                         ttl: 1000,
    //                     },
    //                 }
    //             ),
    //         ]);

    //         await this.databaseService.commitTransaction(session);

    //         return {
    //             data: { _id: created._id },
    //         };
    //     } catch (err: unknown) {
    //         await this.databaseService.abortTransaction(session);

    //         throw new InternalServerErrorException({
    //             statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    //             message: 'http.serverError.internalServerError',
    //             _error: err,
    //         });
    //     }
    // }

    // @UserAdminUpdateDoc()
    // @Response('user.update')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.USER,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @ApiKeyProtected()
    // @Put('/update/:user')
    // async update(
    //     @Param('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
    //     user: UserDoc,
    //     @Body() { name, country, role, gender }: UserUpdateRequestDto
    // ): Promise<void> {
    //     const checkRole = await this.roleService.findOneActiveById(role);
    //     if (!checkRole) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
    //             message: 'role.error.notFound',
    //         });
    //     }

    //     const checkCountry = await this.countryService.findOneById(country);
    //     if (!checkCountry) {
    //         throw new NotFoundException({
    //             statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
    //             message: 'country.error.notFound',
    //         });
    //     }

    //     const session: ClientSession =
    //         await this.databaseService.createTransaction();

    //     try {
    //         await this.userService.update(
    //             user,
    //             { name, country, role, gender },
    //             { session }
    //         );

    //         await this.activityService.createByUser(
    //             user,
    //             {
    //                 description: this.messageService.setMessage(
    //                     'activity.user.updateByAdmin'
    //                 ),
    //             },
    //             { session }
    //         );

    //         await this.databaseService.commitTransaction(session);
    //     } catch (err: unknown) {
    //         await this.databaseService.abortTransaction(session);

    //         throw new InternalServerErrorException({
    //             statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    //             message: 'http.serverError.internalServerError',
    //             _error: err,
    //         });
    //     }
    // }

    // @UserAdminUpdateStatusDoc()
    // @Response('user.updateStatus')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.USER,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @ApiKeyProtected()
    // @Patch('/update/:user/status')
    // async updateStatus(
    //     @Param('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
    //     user: UserDoc,
    //     @Body() { status }: UserUpdateStatusRequestDto
    // ): Promise<IResponse<void>> {
    //     if (user.status === ENUM_USER_STATUS.BLOCKED) {
    //         throw new BadRequestException({
    //             statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
    //             message: 'user.error.statusInvalid',
    //             _metadata: {
    //                 customProperty: {
    //                     messageProperties: {
    //                         status: status.toLowerCase(),
    //                     },
    //                 },
    //             },
    //         });
    //     }

    //     const session: ClientSession =
    //         await this.databaseService.createTransaction();

    //     try {
    //         await this.userService.updateStatus(user, { status }, { session });

    //         await this.activityService.createByUser(
    //             user,
    //             {
    //                 description: this.messageService.setMessage(
    //                     `activity.user.${status.toLowerCase()}ByAdmin`
    //                 ),
    //             },
    //             { session }
    //         );

    //         await this.databaseService.commitTransaction(session);

    //         return {
    //             _metadata: {
    //                 customProperty: {
    //                     messageProperties: {
    //                         status: status.toLowerCase(),
    //                     },
    //                 },
    //             },
    //         };
    //     } catch (err: unknown) {
    //         await this.databaseService.abortTransaction(session);

    //         throw new InternalServerErrorException({
    //             statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    //             message: 'http.serverError.internalServerError',
    //             _error: err,
    //         });
    //     }
    // }
}
