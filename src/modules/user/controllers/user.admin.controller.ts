import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import { UserListRequestSchema } from '@modules/user/dtos/request/user.list.request.dto';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import { UserExportRequestSchema } from '@modules/user/dtos/request/user.export.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UploadedFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    Response,
    ResponseFile,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import { UserGetListOffsetByAdminUseCase } from '@modules/user/use-cases/user.get-list-offset-by-admin.use-case';
import { UserGetOneUseCase } from '@modules/user/use-cases/user.get-one.use-case';
import { UserCreateByAdminUseCase } from '@modules/user/use-cases/user.create-by-admin.use-case';
import { UserUpdateStatusByAdminUseCase } from '@modules/user/use-cases/user.update-status-by-admin.use-case';
import { UserUpdatePasswordByAdminUseCase } from '@modules/user/use-cases/user.update-password-by-admin.use-case';
import { UserResetTwoFactorByAdminUseCase } from '@modules/user/use-cases/user.reset-two-factor-by-admin.use-case';
import { UserImportByAdminUseCase } from '@modules/user/use-cases/user.import-by-admin.use-case';
import { UserExportByAdminUseCase } from '@modules/user/use-cases/user.export-by-admin.use-case';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type {
    IUser,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import type {
    IResponseFileReturn,
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { UserListResponseSchema } from '@modules/user/dtos/response/user.list.response.dto';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { DatabaseIdResponseSchema } from '@common/database/dtos/response/database.id.response.dto';
import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import {
    RequestThrottle,
    RequestTimeout,
} from '@common/request/decorators/request.decorator';
import { UserUpdateStatusRequestSchema } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { FileRequiredPipe } from '@common/file/pipes/file.required.pipe';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileCsvParsePipe } from '@common/file/pipes/file.csv-parse.pipe';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { UserImportRequestSchema } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(
        private readonly userGetListOffsetByAdminUseCase: UserGetListOffsetByAdminUseCase,
        private readonly userGetOneUseCase: UserGetOneUseCase,
        private readonly userCreateByAdminUseCase: UserCreateByAdminUseCase,
        private readonly userUpdateStatusByAdminUseCase: UserUpdateStatusByAdminUseCase,
        private readonly userUpdatePasswordByAdminUseCase: UserUpdatePasswordByAdminUseCase,
        private readonly userResetTwoFactorByAdminUseCase: UserResetTwoFactorByAdminUseCase,
        private readonly userImportByAdminUseCase: UserImportByAdminUseCase,
        private readonly userExportByAdminUseCase: UserExportByAdminUseCase
    ) {}

    @Doc({ summary: 'get all users' })
    @ResponsePagination('user.list', { schema: UserListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: UserListRequestSchema }) query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        return this.userGetListOffsetByAdminUseCase.execute(query);
    }

    @Doc({ summary: 'get detail an user' })
    @Response('user.get', { schema: UserProfileResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:userId')
    async get(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string
    ): Promise<IResponseReturn<IUserProfile>> {
        return this.userGetOneUseCase.execute(userId);
    }

    @Doc({ summary: 'create a user' })
    @Response('user.create', { schema: DatabaseIdResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body({ schema: UserCreateRequestSchema })
        body: UserCreateRequestDto,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        return this.userCreateByAdminUseCase.execute(body, user);
    }

    @Doc({ summary: 'update status of user' })
    @Response('user.updateStatus')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:userId/status')
    async updateStatus(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string,
        @UserCurrent() user: IUser,
        @Body({ schema: UserUpdateStatusRequestSchema })
        body: UserUpdateStatusRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userUpdateStatusByAdminUseCase.execute(userId, body, user);
    }

    @Doc({ summary: 'update password of user' })
    @Response('user.updatePassword')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:userId/password')
    async updatePassword(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<void>> {
        return this.userUpdatePasswordByAdminUseCase.execute(userId, user);
    }

    @Doc({ summary: 'reset user' })
    @Response('user.twoFactor.resetByAdmin')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/2fa/:userId/reset')
    async resetTwoFactorByAdmin(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<void>> {
        return this.userResetTwoFactorByAdminUseCase.execute(userId, user);
    }

    @Doc({ summary: 'import users via csv file' })
    @Response('user.import')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @FileUploadSingle()
    @RequestTimeout('1m')
    @HttpCode(HttpStatus.OK)
    @Post('/import')
    async import(
        @AuthJwtPayload('userId')
        createdBy: string,
        @UploadedFile(
            FileRequiredPipe(),
            FileExtensionPipe([EnumFileExtensionDocument.csv]),
            FileCsvParsePipe,
            FileCsvValidationPipe(UserImportRequestSchema, {
                maxDataImportConfigKey: 'user.maxDataImport',
            })
        )
        data: UserImportRequestDto[]
    ): Promise<IResponseReturn<void>> {
        return this.userImportByAdminUseCase.execute(data, createdBy);
    }

    @Doc({ summary: 'export users via csv file' })
    @ResponseFile({ maxDataExportConfigKey: 'user.maxDataExport' })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/export')
    async export(
        @Query({ schema: UserExportRequestSchema })
        query: UserExportRequestDto
    ): Promise<IResponseFileReturn> {
        return this.userExportByAdminUseCase.execute(query);
    }
}
