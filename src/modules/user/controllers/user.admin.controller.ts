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
    UploadedFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    Response,
    ResponseFile,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { UserHttpService } from '@modules/user/services/user.http.service';
import { UserImportHttpService } from '@modules/user/services/user.import.http.service';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualString,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
    UserDefaultStatus,
} from '@modules/user/constants/user.list.constant';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponseFileReturn,
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import {
    UserAdminCreateDoc,
    UserAdminExportDoc,
    UserAdminGetDoc,
    UserAdminImportDoc,
    UserAdminListDoc,
    UserAdminResetTwoFactorDoc,
    UserAdminUpdatePasswordDoc,
    UserAdminUpdateStatusDoc,
} from '@modules/user/docs/user.admin.doc';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { RequestTimeout } from '@common/request/decorators/request.decorator';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileCsvParsePipe } from '@common/file/pipes/file.csv-parse.pipe';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';

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

    @UserAdminListDoc()
    @ResponsePaging('user.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
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
        @PaginationOffsetQuery({
            availableSearch: UserDefaultAvailableSearch,
            availableOrderBy: UserDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('roleId')
        roleId?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('countryId')
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        return this.userHttpService.getListOffsetByAdmin(
            pagination,
            status,
            roleId,
            countryId
        );
    }

    @UserAdminGetDoc()
    @Response('user.get')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
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
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        return this.userHttpService.getOne(userId);
    }

    @UserAdminCreateDoc()
    @Response('user.create')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminUserCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Body()
        body: UserCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        return this.userHttpService.createByAdmin(body, createdBy);
    }

    @UserAdminUpdateStatusDoc()
    @Response('user.updateStatus')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminUserUpdateStatus)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/:userId/status')
    async updateStatus(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @Body() body: UserUpdateStatusRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userHttpService.updateStatusByAdmin(
            userId,
            body,
            updatedBy
        );
    }

    @UserAdminUpdatePasswordDoc()
    @Response('user.updatePassword')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminUserUpdatePassword)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:userId/password')
    async updatePassword(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.userPasswordHttpService.updatePasswordByAdmin(
            userId,
            updatedBy
        );
    }

    @UserAdminResetTwoFactorDoc()
    @Response('user.twoFactor.resetByAdmin')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminUserResetTwoFactor)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/2fa/:userId/reset')
    async resetTwoFactorByAdmin(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<void> {
        await this.userTwoFactorHttpService.resetTwoFactorByAdmin(
            userId,
            updatedBy
        );
    }

    @UserAdminImportDoc()
    @Response('user.import')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminUserImport)
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
            RequestRequiredPipe,
            FileExtensionPipe([EnumFileExtensionDocument.csv]),
            FileCsvParsePipe,
            FileCsvValidationPipe(UserImportRequestDto, {
                maxDataImportConfigKey: 'user.maxDataImport',
            })
        )
        data: UserImportRequestDto[]
    ): Promise<void> {
        await this.userImportHttpService.importByAdmin(data, createdBy);
    }

    @UserAdminExportDoc()
    @ResponseFile()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
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
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('roleId')
        roleId?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('countryId')
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponseFileReturn> {
        return this.userImportHttpService.exportByAdmin(
            status,
            roleId,
            countryId
        );
    }
}
