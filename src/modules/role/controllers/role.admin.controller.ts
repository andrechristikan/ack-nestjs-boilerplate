import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { RoleAdminListRequestSchema } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { RoleGetListOffsetByAdminUseCase } from '@modules/role/use-cases/role.get-list-offset-by-admin.use-case';
import { RoleGetOneUseCase } from '@modules/role/use-cases/role.get-one.use-case';
import { RoleCreateByAdminUseCase } from '@modules/role/use-cases/role.create-by-admin.use-case';
import { RoleUpdateByAdminUseCase } from '@modules/role/use-cases/role.update-by-admin.use-case';
import { RoleDeleteByAdminUseCase } from '@modules/role/use-cases/role.delete-by-admin.use-case';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleCreateRequestSchema } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { RoleSchema } from '@modules/role/dtos/role.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(
        private readonly roleGetListOffsetByAdminUseCase: RoleGetListOffsetByAdminUseCase,
        private readonly roleGetOneUseCase: RoleGetOneUseCase,
        private readonly roleCreateByAdminUseCase: RoleCreateByAdminUseCase,
        private readonly roleUpdateByAdminUseCase: RoleUpdateByAdminUseCase,
        private readonly roleDeleteByAdminUseCase: RoleDeleteByAdminUseCase
    ) {}

    @Doc({ summary: 'get list of roles' })
    @ResponsePagination('role.list', { schema: RoleListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: RoleAdminListRequestSchema })
        query: RoleAdminListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        return this.roleGetListOffsetByAdminUseCase.execute(
            policyContext,
            query
        );
    }

    @Doc({ summary: 'get detail a role' })
    @Response('role.get', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:roleId')
    async get(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleGetOneUseCase.execute(policyContext, roleId);
    }

    @Doc({ summary: 'create a role' })
    @Response('role.create', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
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
        @PolicyContext() policyContext: IPolicyContext,
        @Body({ schema: RoleCreateRequestSchema })
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleCreateByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            body
        );
    }

    @Doc({ summary: 'update data a role' })
    @Response('role.update', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:roleId')
    async update(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Body({ schema: RoleUpdateRequestSchema })
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleUpdateByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            roleId,
            body
        );
    }

    @Doc({ summary: 'delete data a role' })
    @Response('role.delete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:roleId')
    async delete(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<void>> {
        return this.roleDeleteByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            roleId
        );
    }
}
