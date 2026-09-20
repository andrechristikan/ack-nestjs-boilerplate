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
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    ApiKeyDefaultAvailableOrderBy,
    ApiKeyDefaultAvailableSearch,
    ApiKeyDefaultType,
} from '@modules/api-key/constants/api-key.list.constant';
import { ApiKeyCreateRequestSchema } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestSchema } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestSchema } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseSchema } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyHttpService } from '@modules/api-key/services/api-key.http.service';
import {
    ApiKeyAdminCreateDoc,
    ApiKeyAdminDeleteDoc,
    ApiKeyAdminListDoc,
    ApiKeyAdminResetDoc,
    ApiKeyAdminUpdateDateDoc,
    ApiKeyAdminUpdateDoc,
    ApiKeyAdminUpdateStatusDoc,
} from '@modules/api-key/docs/api-key.admin.doc';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    EnumApiKeyType,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { IApiKeyList } from '@modules/api-key/interfaces/api-key.interface';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { ApiKeyUpdateStatusRequestSchema } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { ApiKeyResponseSchema } from '@modules/api-key/dtos/response/api-key.response.dto';

@ApiTags('modules.admin.apiKey')
@Controller({
    version: '1',
    path: '/api-key',
})
export class ApiKeyAdminController {
    constructor(private readonly apiKeyHttpService: ApiKeyHttpService) {}

    @ApiKeyAdminListDoc()
    @ResponsePaging('apiKey.list', {
        schema: ApiKeyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
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
            availableSearch: ApiKeyDefaultAvailableSearch,
            availableOrderBy: ApiKeyDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput>,
        @PaginationQueryFilterEqualBoolean('isActive')
        isActive?: Record<string, IPaginationEqual>,
        @PaginationQueryFilterInEnum<EnumApiKeyType>('type', ApiKeyDefaultType)
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IApiKeyList>> {
        return this.apiKeyHttpService.getListByAdmin(
            pagination,
            isActive,
            type
        );
    }

    @ApiKeyAdminCreateDoc()
    @Response('apiKey.create', {
        schema: ApiKeyCreateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Body({ schema: ApiKeyCreateRequestSchema })
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyHttpService.createByAdmin(body);
    }

    @ApiKeyAdminResetDoc()
    @Response('apiKey.reset', {
        schema: ApiKeyCreateResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/reset/:apiKeyId')
    async reset(
        @Param('apiKeyId', { schema: RequestUuidSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyHttpService.resetByAdmin(apiKeyId);
    }

    @ApiKeyAdminUpdateDoc()
    @Response('apiKey.update', {
        schema: ApiKeyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:apiKeyId')
    async update(
        @Body({ schema: ApiKeyUpdateRequestSchema })
        body: ApiKeyUpdateRequestDto,
        @Param('apiKeyId', { schema: RequestUuidSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKey>> {
        return this.apiKeyHttpService.updateByAdmin(apiKeyId, body);
    }

    @ApiKeyAdminUpdateDateDoc()
    @Response('apiKey.updateDate', {
        schema: ApiKeyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:apiKeyId/date')
    async updateDate(
        @Body({ schema: ApiKeyUpdateDateRequestSchema })
        body: ApiKeyUpdateDateRequestDto,
        @Param('apiKeyId', { schema: RequestUuidSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKey>> {
        return this.apiKeyHttpService.updateDatesByAdmin(apiKeyId, body);
    }

    @ApiKeyAdminUpdateStatusDoc()
    @Response('apiKey.updateStatus', {
        schema: ApiKeyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/:apiKeyId/status')
    async updateStatus(
        @Param('apiKeyId', { schema: RequestUuidSchema })
        apiKeyId: string,
        @Body({ schema: ApiKeyUpdateStatusRequestSchema })
        body: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKey>> {
        return this.apiKeyHttpService.updateStatusByAdmin(apiKeyId, body);
    }

    @ApiKeyAdminDeleteDoc()
    @Response('apiKey.delete', {
        schema: ApiKeyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/delete/:apiKeyId')
    async delete(
        @Param('apiKeyId', { schema: RequestUuidSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKey>> {
        return this.apiKeyHttpService.deleteByAdmin(apiKeyId);
    }
}
