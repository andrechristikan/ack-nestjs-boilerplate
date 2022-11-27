import {
    Controller,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
    InternalServerErrorException,
    Patch,
    NotFoundException,
    UploadedFile,
    ConflictException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { UploadFileSingle } from 'src/common/file/decorators/file.decorator';
import { IFileExtract } from 'src/common/file/interfaces/file.interface';
import { FileExtractPipe } from 'src/common/file/pipes/file.extract.pipe';
import { FileRequiredPipe } from 'src/common/file/pipes/file.required.pipe';
import { FileSizeExcelPipe } from 'src/common/file/pipes/file.size.pipe';
import { FileTypeExcelPipe } from 'src/common/file/pipes/file.type.pipe';
import { FileValidationPipe } from 'src/common/file/pipes/file.validation.pipe';
import { ENUM_HELPER_FILE_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponseExcel,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import {
    UserDeleteGuard,
    UserGetGuard,
    UserUpdateGuard,
} from 'src/modules/user/decorators/user.admin.decorator';
import { GetUser } from 'src/modules/user/decorators/user.decorator';
import {
    UserCreateDoc,
    UserDeleteDoc,
    UserExportDoc,
    UserGetDoc,
    UserImportDoc,
    UserListDoc,
    UserUpdateDoc,
} from 'src/modules/user/docs/user.admin.doc';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserImportDto } from 'src/modules/user/dtos/user.import.dto';
import { UserListDto } from 'src/modules/user/dtos/user.list.dto';
import { UserRequestDto } from 'src/modules/user/dtos/user.request.dto';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';
import { UserImportSerialization } from 'src/modules/user/serializations/user.import.serialization';
import { UserListSerialization } from 'src/modules/user/serializations/user.list.serialization';
import { UserService } from 'src/modules/user/services/user.service';
import {
    AuthJwtAdminAccessProtected,
    AuthJwtPermissionProtected,
} from 'src/common/auth/decorators/auth.jwt.decorator';

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
        private readonly roleService: RoleService
    ) {}

    @UserListDoc()
    @ResponsePaging('user.list', {
        serialization: UserListSerialization,
    })
    @AuthJwtPermissionProtected(ENUM_AUTH_PERMISSIONS.USER_READ)
    @AuthJwtAdminAccessProtected()
    @Get('/list')
    async list(
        @Query()
        {
            page,
            perPage,
            sort,
            search,
            availableSort,
            availableSearch,
        }: UserListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {
            ...search,
        };

        const users: IUserEntity[] = await this.userService.findAll(find, {
            paging: {
                limit: perPage,
                skip: skip,
            },
            sort,
        });
        const totalData: number = await this.userService.getTotal(find);
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            availableSearch,
            availableSort,
            data: users,
        };
    }

    @UserGetDoc()
    @Response('user.get', {
        serialization: UserGetSerialization,
    })
    @UserGetGuard()
    @RequestParamGuard(UserRequestDto)
    @AuthJwtPermissionProtected(ENUM_AUTH_PERMISSIONS.USER_READ)
    @AuthJwtAdminAccessProtected()
    @Get('get/:user')
    async get(@GetUser() user: IUserEntity): Promise<IResponse> {
        return user;
    }

    @UserCreateDoc()
    @Response('user.create', {
        serialization: ResponseIdSerialization,
    })
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_CREATE
    )
    @AuthJwtAdminAccessProtected()
    @Post('/create')
    async create(
        @Body()
        { username, email, mobileNumber, role, ...body }: UserCreateDto
    ): Promise<IResponse> {
        const checkRole = await this.roleService.findOneById(role);
        if (!checkRole) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        }

        const usernameExist: boolean = await this.userService.existUsername(
            username
        );
        if (usernameExist) {
            throw new ConflictException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR,
                message: 'user.error.usernameExist',
            });
        }

        const emailExist: boolean = await this.userService.existEmail(email);
        if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        }

        if (mobileNumber) {
            const mobileNumberExist: boolean =
                await this.userService.existMobileNumber(mobileNumber);
            if (mobileNumberExist) {
                throw new ConflictException({
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                    message: 'user.error.mobileNumberExist',
                });
            }
        }

        try {
            const password = await this.authService.createPassword(
                body.password
            );

            const create = await this.userService.create({
                firstName: body.firstName,
                lastName: body.lastName,
                role,
                password: password.passwordHash,
                passwordExpired: password.passwordExpired,
                salt: password.salt,
                username,
                email,
                mobileNumber,
            });

            return {
                _id: create._id,
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }

    @UserDeleteDoc()
    @Response('user.delete')
    @UserDeleteGuard()
    @RequestParamGuard(UserRequestDto)
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_DELETE
    )
    @AuthJwtAdminAccessProtected()
    @Delete('/delete/:user')
    async delete(@GetUser() user: IUserEntity): Promise<void> {
        try {
            await this.userService.deleteOneById(user._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @UserUpdateDoc()
    @Response('user.update', {
        serialization: ResponseIdSerialization,
    })
    @UserUpdateGuard()
    @RequestParamGuard(UserRequestDto)
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_UPDATE
    )
    @AuthJwtAdminAccessProtected()
    @Put('/update/:user')
    async update(
        @GetUser() user: IUserEntity,
        @Body()
        body: UserUpdateDto
    ): Promise<IResponse> {
        try {
            await this.userService.updateOneById(user._id, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return {
            _id: user._id,
        };
    }

    @UserImportDoc()
    @Response('user.import', {
        serialization: UserImportSerialization,
    })
    @UploadFileSingle('file')
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_CREATE,
        ENUM_AUTH_PERMISSIONS.USER_IMPORT
    )
    @AuthJwtAdminAccessProtected()
    @Post('/import')
    async import(
        @UploadedFile(
            FileRequiredPipe,
            FileSizeExcelPipe,
            FileTypeExcelPipe,
            FileExtractPipe,
            new FileValidationPipe<UserImportDto>(UserImportDto)
        )
        file: IFileExtract<UserImportDto>
    ): Promise<IResponse> {
        return { file };
    }

    @UserExportDoc()
    @ResponseExcel({
        serialization: UserListSerialization,
        type: ENUM_HELPER_FILE_TYPE.CSV,
    })
    @AuthJwtPermissionProtected(
        ENUM_AUTH_PERMISSIONS.USER_READ,
        ENUM_AUTH_PERMISSIONS.USER_EXPORT
    )
    @AuthJwtAdminAccessProtected()
    @Post('/export')
    async export(): Promise<IResponse> {
        return this.userService.findAll({});
    }
}
