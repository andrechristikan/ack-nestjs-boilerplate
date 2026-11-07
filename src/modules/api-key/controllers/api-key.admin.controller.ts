import type { ApiKeyListRequestDto } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import { ApiKeyListRequestSchema } from '@modules/api-key/dtos/request/api-key.list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import { ApiKeyCreateRequestSchema } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestSchema } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestSchema } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseSchema } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyGetListByAdminUseCase } from '@modules/api-key/use-cases/api-key.get-list-by-admin.use-case';
import { ApiKeyCreateByAdminUseCase } from '@modules/api-key/use-cases/api-key.create-by-admin.use-case';
import { ApiKeyResetByAdminUseCase } from '@modules/api-key/use-cases/api-key.reset-by-admin.use-case';
import { ApiKeyUpdateByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-by-admin.use-case';
import { ApiKeyUpdateDatesByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-dates-by-admin.use-case';
import { ApiKeyUpdateStatusByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-status-by-admin.use-case';
import { ApiKeyDeleteByAdminUseCase } from '@modules/api-key/use-cases/api-key.delete-by-admin.use-case';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
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
    constructor(
        private readonly apiKeyGetListByAdminUseCase: ApiKeyGetListByAdminUseCase,
        private readonly apiKeyCreateByAdminUseCase: ApiKeyCreateByAdminUseCase,
        private readonly apiKeyResetByAdminUseCase: ApiKeyResetByAdminUseCase,
        private readonly apiKeyUpdateByAdminUseCase: ApiKeyUpdateByAdminUseCase,
        private readonly apiKeyUpdateDatesByAdminUseCase: ApiKeyUpdateDatesByAdminUseCase,
        private readonly apiKeyUpdateStatusByAdminUseCase: ApiKeyUpdateStatusByAdminUseCase,
        private readonly apiKeyDeleteByAdminUseCase: ApiKeyDeleteByAdminUseCase
    ) {}

    @Doc({ summary: 'get list of api keys' })
    @ResponsePagination('apiKey.list', {
        schema: ApiKeyResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: ApiKeyListRequestSchema }) query: ApiKeyListRequestDto
    ): Promise<IResponsePaginationReturn<IApiKey>> {
        return this.apiKeyGetListByAdminUseCase.execute(query);
    }

    @Doc({ summary: 'create an api key' })
    @Response('apiKey.create', { schema: ApiKeyCreateResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.apiKey,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body({ schema: ApiKeyCreateRequestSchema })
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyCreateByAdminUseCase.execute(body);
    }

    @Doc({ summary: 'reset secret an api key' })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/reset/:apiKeyId')
    async reset(
        @Param('apiKeyId', { schema: RequestMongoIdSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        return this.apiKeyResetByAdminUseCase.execute(apiKeyId);
    }

    @Doc({ summary: 'update data an api key' })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKeyId')
    async update(
        @Body({ schema: ApiKeyUpdateRequestSchema })
        body: ApiKeyUpdateRequestDto,
        @Param('apiKeyId', { schema: RequestMongoIdSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<IApiKey>> {
        return this.apiKeyUpdateByAdminUseCase.execute(apiKeyId, body);
    }

    @Doc({ summary: 'update date of api key' })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:apiKeyId/date')
    async updateDate(
        @Body({ schema: ApiKeyUpdateDateRequestSchema })
        body: ApiKeyUpdateDateRequestDto,
        @Param('apiKeyId', { schema: RequestMongoIdSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<IApiKey>> {
        return this.apiKeyUpdateDatesByAdminUseCase.execute(apiKeyId, body);
    }

    @Doc({ summary: 'update status of an api key' })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:apiKeyId/status')
    async updateStatus(
        @Param('apiKeyId', { schema: RequestMongoIdSchema })
        apiKeyId: string,
        @Body({ schema: ApiKeyUpdateStatusRequestSchema })
        body: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<IApiKey>> {
        return this.apiKeyUpdateStatusByAdminUseCase.execute(apiKeyId, body);
    }

    @Doc({ summary: 'delete an api key' })
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:apiKeyId')
    async delete(
        @Param('apiKeyId', { schema: RequestMongoIdSchema })
        apiKeyId: string
    ): Promise<IResponseReturn<IApiKey>> {
        return this.apiKeyDeleteByAdminUseCase.execute(apiKeyId);
    }
}
