import {
    Controller,
    Get,
    Post,
    Body,
    Delete,
    Put,
    NotFoundException,
    UploadedFile,
    ConflictException,
    Patch,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/common/auth/services/auth.service';
import { IFileExtract } from 'src/common/file/interfaces/file.interface';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponseFileExcel,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponseFileExcel,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import {
    UserAdminDeleteGuard,
    UserAdminGetGuard,
    UserAdminUpdateActiveGuard,
    UserAdminUpdateBlockedGuard,
    UserAdminUpdateGuard,
    UserAdminUpdateInactiveGuard,
} from 'src/modules/user/decorators/user.admin.decorator';
import { GetUser } from 'src/modules/user/decorators/user.decorator';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserImportDto } from 'src/modules/user/dtos/user.import.dto';
import { UserRequestDto } from 'src/modules/user/dtos/user.request.dto';
import {
    IUserDoc,
    IUserEntity,
} from 'src/modules/user/interfaces/user.interface';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { UserUpdateNameDto } from 'src/modules/user/dtos/user.update-name.dto';
import {
    USER_DEFAULT_AVAILABLE_ORDER_BY,
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_BLOCKED,
    USER_DEFAULT_INACTIVE_PERMANENT,
    USER_DEFAULT_IS_ACTIVE,
    USER_DEFAULT_ORDER_BY,
    USER_DEFAULT_ORDER_DIRECTION,
    USER_DEFAULT_PER_PAGE,
} from 'src/modules/user/constants/user.list.constant';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import {
    PaginationQuery,
    PaginationQueryFilterEqualObjectId,
    PaginationQueryFilterInBoolean,
} from 'src/common/pagination/decorators/pagination.decorator';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { PolicyAbilityProtected } from 'src/common/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import {
    UserAdminActiveDoc,
    UserAdminBlockedDoc,
    UserAdminCreateDoc,
    UserAdminDeleteDoc,
    UserAdminExportDoc,
    UserAdminGetDoc,
    UserAdminImportDoc,
    UserAdminInactiveDoc,
    UserAdminListDoc,
    UserAdminUpdateDoc,
} from 'src/modules/user/docs/user.admin.doc';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { ApiKeyPublicProtected } from 'src/common/api-key/decorators/api-key.decorator';
import { EmailService } from 'src/modules/email/services/email.service';
import { FileUploadSingle } from 'src/common/file/decorators/file.decorator';
import { FileTypePipe } from 'src/common/file/pipes/file.type.pipe';
import { FileExcelExtractPipe } from 'src/common/file/pipes/file.excel-extract.pipe';
import { FileExcelValidationPipe } from 'src/common/file/pipes/file.excel-validation.pipe';
import { ENUM_FILE_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/constants/helper.enum.constant';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(
        private readonly authService: AuthService,
        private readonly paginationService: PaginationService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly emailService: EmailService
    ) {}

    @UserAdminListDoc()
    @ResponsePaging('user.list', {
        serialization: UserListSerialization,
    })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @Get('/list')
    async list(
        @PaginationQuery(
            USER_DEFAULT_PER_PAGE,
            USER_DEFAULT_ORDER_BY,
            USER_DEFAULT_ORDER_DIRECTION,
            USER_DEFAULT_AVAILABLE_SEARCH,
            USER_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', USER_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>,
        @PaginationQueryFilterInBoolean('blocked', USER_DEFAULT_BLOCKED)
        blocked: Record<string, any>,
        @PaginationQueryFilterInBoolean(
            'inactivePermanent',
            USER_DEFAULT_INACTIVE_PERMANENT
        )
        inactivePermanent: Record<string, any>,
        @PaginationQueryFilterEqualObjectId('role')
        role: Record<string, any>
    ): Promise<IResponsePaging> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
            ...blocked,
            ...inactivePermanent,
            ...role,
        };

        const users: IUserEntity[] =
            await this.userService.findAll<IUserEntity>(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
                plainObject: true,
            });
        const total: number = await this.userService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: users,
        };
    }

    @UserAdminGetDoc()
    @Response('user.get', {
        serialization: UserGetSerialization,
    })
    @UserAdminGetGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(UserRequestDto)
    @Get('/get/:user')
    async get(@GetUser() user: UserDoc): Promise<IResponse> {
        const userWithRole: IUserDoc =
            await this.userService.joinWithRole(user);
        return { data: userWithRole.toObject() };
    }

    @UserAdminCreateDoc()
    @Response('user.create', {
        serialization: ResponseIdSerialization,
    })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @Post('/create')
    async create(
        @Body()
        { email, mobileNumber, role, ...body }: UserCreateDto
    ): Promise<IResponse> {
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
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (mobileNumberExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        const password: IAuthPassword = await this.authService.createPassword(
            body.password
        );

        const created: UserDoc = await this.userService.create(
            {
                email,
                mobileNumber,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.ADMIN,
                role,
                ...body,
            },
            password
        );

        await this.emailService.sendSignUp(created);

        return {
            data: { _id: created._id },
        };
    }

    @UserAdminUpdateDoc()
    @Response('user.update', {
        serialization: ResponseIdSerialization,
    })
    @UserAdminUpdateGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(UserRequestDto)
    @Put('/update/:user')
    async update(
        @GetUser() user: UserDoc,
        @Body()
        body: UserUpdateNameDto
    ): Promise<IResponse> {
        await this.userService.updateName(user, body);

        return {
            data: { _id: user._id },
        };
    }

    @UserAdminInactiveDoc()
    @Response('user.inactive')
    @UserAdminUpdateInactiveGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(UserRequestDto)
    @Patch('/update/:user/inactive')
    async inactive(@GetUser() user: UserDoc): Promise<void> {
        await this.userService.inactive(user);

        return;
    }

    @UserAdminActiveDoc()
    @Response('user.active')
    @UserAdminUpdateActiveGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(UserRequestDto)
    @Patch('/update/:user/active')
    async active(@GetUser() user: UserDoc): Promise<void> {
        await this.userService.active(user);

        return;
    }

    @UserAdminBlockedDoc()
    @Response('user.blocked')
    @UserAdminUpdateBlockedGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(UserRequestDto)
    @Patch('/update/:user/blocked')
    async blocked(@GetUser() user: UserDoc): Promise<void> {
        await this.userService.blocked(user);

        return;
    }

    @UserAdminDeleteDoc()
    @Response('user.delete')
    @UserAdminDeleteGuard()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @RequestParamGuard(UserRequestDto)
    @Delete('/delete/:user')
    async delete(@GetUser() user: UserDoc): Promise<void> {
        await this.userService.delete(user);

        return;
    }

    @UserAdminImportDoc()
    @Response('user.import')
    @FileUploadSingle()
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [
            ENUM_POLICY_ACTION.READ,
            ENUM_POLICY_ACTION.CREATE,
            ENUM_POLICY_ACTION.IMPORT,
        ],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @Post('/import')
    async import(
        @UploadedFile(
            new FileRequiredPipe(),
            new FileTypePipe([ENUM_FILE_MIME.CSV]),
            FileExcelExtractPipe,
            new FileExcelValidationPipe<UserImportDto>(UserImportDto)
        )
        file: IFileExtract<UserImportDto>
    ): Promise<void> {
        const checkRole = await this.roleService.findOneByName('user');
        if (!checkRole) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        }

        const mobileNumbers =
            file.extracts[0].data.map((e) => e.mobileNumber).filter((e) => e) ??
            [];
        const emails = file.extracts[0].data.map((e) => e.email) ?? [];

        const promises: Promise<any>[] = [
            this.userService.existByEmails(emails),
        ];

        if (mobileNumbers && mobileNumbers.length > 0) {
            promises.push(this.userService.existByMobileNumbers(mobileNumbers));
        }

        const [emailExist, mobileNumberExist] = await Promise.all(promises);

        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (mobileNumberExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        const passwordString: string =
            await this.authService.createPasswordRandom();
        const password: IAuthPassword =
            await this.authService.createPassword(passwordString);

        await this.userService.import(
            file.extracts[0].data,
            checkRole._id,
            password
        );

        return;
    }

    @UserAdminExportDoc()
    @ResponseFileExcel({
        serialization: [UserListSerialization],
        type: ENUM_HELPER_FILE_EXCEL_TYPE.CSV,
    })
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.EXPORT],
    })
    @AuthJwtAdminAccessProtected()
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/export')
    async export(): Promise<IResponseFileExcel> {
        const users: IUserEntity[] =
            await this.userService.findAll<IUserEntity>(
                {},
                {
                    plainObject: true,
                }
            );

        return { data: [{ data: users }] };
    }
}
