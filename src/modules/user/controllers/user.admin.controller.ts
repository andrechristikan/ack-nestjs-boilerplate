import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
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
import { UserImportByAdminUseCase } from '@modules/user/use-cases/user.import-by-admin.use-case';
import { UserExportByAdminUseCase } from '@modules/user/use-cases/user.export-by-admin.use-case';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type {
    IUserContext,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import type {
    IResponseFileReturn,
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { UserListResponseSchema } from '@modules/user/dtos/response/user.list.response.dto';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { DatabaseIdResponseSchema } from '@common/database/dtos/response/database.id.response.dto';
import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import {
    RequestContext,
    RequestThrottle,
    RequestTimeout,
} from '@common/request/decorators/request.decorator';
import { RequestUploadTimeout } from '@common/request/constants/request.constant';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { UserUpdateStatusRequestSchema } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { FileImportSingle } from '@common/file/decorators/file.decorator';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { FileRequiredPipe } from '@common/file/pipes/file.required.pipe';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileCsvParsePipe } from '@common/file/pipes/file.csv-parse.pipe';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { UserImportRequestSchema } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import { UserImportResponseSchema } from '@modules/user/dtos/response/user.import.response.dto';
import type { UserImportResponseDto } from '@modules/user/dtos/response/user.import.response.dto';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

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
        private readonly userImportByAdminUseCase: UserImportByAdminUseCase,
        private readonly userExportByAdminUseCase: UserExportByAdminUseCase
    ) {}

    @Doc({ summary: 'get all users' })
    @ResponsePagination('user.list', { schema: UserListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: UserListRequestSchema }) query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        return this.userGetListOffsetByAdminUseCase.execute(
            policyContext,
            query
        );
    }

    @Doc({ summary: 'get detail an user' })
    @Response('user.get', { schema: UserProfileResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:userId')
    async get(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<IUserProfile>> {
        return this.userGetOneUseCase.execute(policyContext, userId);
    }

    @Doc({ summary: 'create a user' })
    @Response('user.create', { schema: DatabaseIdResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: UserCreateRequestSchema })
        body: UserCreateRequestDto
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        return this.userCreateByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }

    @Doc({ summary: 'update status of user' })
    @Response('user.updateStatus')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:userId/status')
    async updateStatus(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Body({ schema: UserUpdateStatusRequestSchema })
        body: UserUpdateStatusRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userUpdateStatusByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            userId,
            body
        );
    }

    @Doc({ summary: 'update password of user' })
    @Response('user.updatePassword')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:userId/password')
    async updatePassword(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<void>> {
        return this.userUpdatePasswordByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            userId
        );
    }

    @Doc({ summary: 'import users via csv file' })
    @Response('user.import', { schema: UserImportResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @FileImportSingle()
    @RequestTimeout(RequestUploadTimeout)
    @HttpCode(HttpStatus.OK)
    @Post('/import')
    async import(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UploadedFile(
            FileRequiredPipe(),
            FileExtensionPipe([EnumFileExtensionDocument.csv]),
            FileCsvParsePipe,
            FileCsvValidationPipe(UserImportRequestSchema, {
                maxDataImportConfigKey: 'user.maxDataImport',
            })
        )
        data: UserImportRequestDto[]
    ): Promise<IResponseReturn<UserImportResponseDto>> {
        return this.userImportByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            data
        );
    }

    @Doc({ summary: 'export users via csv file' })
    @ResponseFile({ maxDataExportConfigKey: 'user.maxDataExport' })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/export')
    async export(
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: UserExportRequestSchema })
        query: UserExportRequestDto
    ): Promise<IResponseFileReturn> {
        return this.userExportByAdminUseCase.execute(policyContext, query);
    }
}
