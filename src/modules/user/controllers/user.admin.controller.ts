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

import { UserHttpService } from '@modules/user/services/user.http.service';
import { UserImportHttpService } from '@modules/user/services/user.import.http.service';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';

import { UserProtected } from '@modules/user/decorators/user.decorator';
import type {
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
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
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
        private readonly userHttpService: UserHttpService,
        private readonly userPasswordHttpService: UserPasswordHttpService,
        private readonly userTwoFactorHttpService: UserTwoFactorHttpService,
        private readonly userImportHttpService: UserImportHttpService
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
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: UserListRequestSchema }) query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        return this.userHttpService.getListOffsetByAdmin(query);
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
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:userId')
    async get(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<IUserProfile>> {
        return this.userHttpService.getOne(userId);
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
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Body({ schema: UserCreateRequestSchema })
        body: UserCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        return this.userHttpService.createByAdmin(body, createdBy);
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
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/:userId/status')
    async updateStatus(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @Body({ schema: UserUpdateStatusRequestSchema })
        body: UserUpdateStatusRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userHttpService.updateStatusByAdmin(
            userId,
            body,
            updatedBy
        );
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
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:userId/password')
    async updatePassword(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.userPasswordHttpService.updatePasswordByAdmin(
            userId,
            updatedBy
        );
    }

    @Doc({ summary: 'Reset user' })
    @Response('user.twoFactor.resetByAdmin')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/2fa/:userId/reset')
    async resetTwoFactorByAdmin(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<void> {
        await this.userTwoFactorHttpService.resetTwoFactorByAdmin(
            userId,
            updatedBy
        );
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
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @FileUploadSingle()
    @RequestTimeout('1m')
    @RequestThrottle({ user: true })
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
    ): Promise<void> {
        await this.userImportHttpService.importByAdmin(data, createdBy);
    }

    @Doc({ summary: 'export users via csv file' })
    @ResponseFile()
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/export')
    async export(
        @Query({ schema: UserExportRequestSchema })
        query: UserExportRequestDto
    ): Promise<IResponseFileReturn> {
        return this.userImportHttpService.exportByAdmin(query);
    }
}
