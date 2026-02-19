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
import { UserService } from '@modules/user/services/user.service';
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
} from '@prisma/client';
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
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    RequestIPAddress,
    RequestTimeout,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileCsvParsePipe } from '@common/file/pipes/file.csv-parse.pipe';
import { FilCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    constructor(private readonly userService: UserService) {}

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
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: UserDefaultAvailableSearch,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('role')
        role?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('country')
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        return this.userService.getListOffsetByAdmin(
            pagination,
            status,
            role,
            country
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
    @Get('/get/:userId')
    async get(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        return this.userService.getOne(userId);
    }

    @UserAdminCreateDoc()
    @Response('user.create')
    @ActivityLog(EnumActivityLogAction.adminUserCreate)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/create')
    async create(
        @Body()
        body: UserCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.userService.createByAdmin(
            body,
            {
                ipAddress,
                userAgent,
            },
            createdBy
        );
    }

    @UserAdminUpdateStatusDoc()
    @Response('user.updateStatus')
    @ActivityLog(EnumActivityLogAction.adminUserUpdateStatus)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:userId/status')
    async updateStatus(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @Body() body: UserUpdateStatusRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.updateStatusByAdmin(
            userId,
            body,
            {
                ipAddress,
                userAgent,
            },
            updatedBy
        );
    }

    @UserAdminUpdatePasswordDoc()
    @Response('user.updatePassword')
    @ActivityLog(EnumActivityLogAction.adminUserUpdatePassword)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:userId/password')
    async updatePassword(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.updatePasswordByAdmin(
            userId,
            {
                ipAddress,
                userAgent,
            },
            updatedBy
        );
    }

    @UserAdminResetTwoFactorDoc()
    @Response('user.twoFactor.resetByAdmin')
    @ActivityLog(EnumActivityLogAction.adminUserResetTwoFactor)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:userId/2fa/reset')
    async resetTwoFactorByAdmin(
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string,
        @AuthJwtPayload('userId') updatedBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.resetTwoFactorByAdmin(userId, updatedBy, {
            ipAddress,
            userAgent,
        });
    }

    @UserAdminImportDoc()
    @Response('user.import')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
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
            RequestRequiredPipe,
            FileExtensionPipe([EnumFileExtensionDocument.csv]),
            FileCsvParsePipe,
            new FilCsvValidationPipe(UserImportRequestDto)
        )
        data: UserImportRequestDto[],
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.importByAdmin(data, createdBy, {
            ipAddress,
            userAgent,
        });
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
    @HttpCode(HttpStatus.OK)
    @Post('/export')
    async export(
        @PaginationQueryFilterInEnum<EnumUserStatus>(
            'status',
            UserDefaultStatus
        )
        status?: Record<string, IPaginationIn>,
        @PaginationQueryFilterEqualString('role')
        role?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterEqualString('country')
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponseFileReturn> {
        return this.userService.exportByAdmin(status, role, country);
    }
}
