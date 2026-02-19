import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultType,
} from '@modules/api-key/constants/api-key.list.constant';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import {
    ApiKeyAdminCreateDoc,
    ApiKeyAdminDeleteDoc,
    ApiKeyAdminListDoc,
    ApiKeyAdminResetDoc,
    ApiKeyAdminUpdateDateDoc,
    ApiKeyAdminUpdateDoc,
    ApiKeyAdminUpdateStatusDoc,
} from '@modules/api-key/docs/api-key.admin.doc';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
    EnumRoleType,
} from '@prisma/client';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';

@ApiTags('modules.admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @ApiKeyAdminListDoc()
    @ResponsePaging('apiKey.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: ApiKeyDefaultAvailableSearch,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterEqualBoolean('isActive')
        isActive?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterInEnum<EnumApiKeyType>('type', ApiKeyDefaultType)
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyDto>> {
        return this.apiKeyService.getListByAdmin(pagination, isActive, type);
    }

    @ApiKeyAdminCreateDoc()
    @Response('apiKey.create')
    @ActivityLog(EnumActivityLogAction.adminApiKeyCreate)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body() body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyService.createByAdmin(body);
    }

    @ApiKeyAdminResetDoc()
    @Response('apiKey.reset')
    @ActivityLog(EnumActivityLogAction.adminApiKeyReset)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKeyId/reset')
    async reset(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyService.resetByAdmin(apiKeyId);
    }

    @ApiKeyAdminUpdateDoc()
    @Response('apiKey.update')
    @ActivityLog(EnumActivityLogAction.adminApiKeyUpdate)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKeyId')
    async update(
        @Body() body: ApiKeyUpdateRequestDto,
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.updateByAdmin(apiKeyId, body);
    }

    @ApiKeyAdminUpdateDateDoc()
    @Response('apiKey.updateDate')
    @ActivityLog(EnumActivityLogAction.adminApiKeyUpdateDate)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKeyId/date')
    async updateDate(
        @Body() body: ApiKeyUpdateDateRequestDto,
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.updateDatesByAdmin(apiKeyId, body);
    }

    @ApiKeyAdminUpdateStatusDoc()
    @Response('apiKey.updateStatus')
    @ActivityLog(EnumActivityLogAction.adminApiKeyUpdateStatus)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKeyId/status')
    async updateStatus(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string,
        @Body() body: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.updateStatusByAdmin(apiKeyId, body);
    }

    @ApiKeyAdminDeleteDoc()
    @Response('apiKey.delete')
    @ActivityLog(EnumActivityLogAction.adminApiKeyDelete)
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:apiKeyId')
    async delete(
        @Param('apiKeyId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyDto>> {
        return this.apiKeyService.deleteByAdmin(apiKeyId);
    }
}
