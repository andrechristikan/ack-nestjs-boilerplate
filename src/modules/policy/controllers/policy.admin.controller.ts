import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
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
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import type { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyCreateRequestSchema } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyListByRoleByAdminUseCase } from '@modules/policy/use-cases/policy.list-by-role-by-admin.use-case';
import { PolicyCreateByAdminUseCase } from '@modules/policy/use-cases/policy.create-by-admin.use-case';
import { PolicyUpdateByAdminUseCase } from '@modules/policy/use-cases/policy.update-by-admin.use-case';
import { PolicyDeleteByAdminUseCase } from '@modules/policy/use-cases/policy.delete-by-admin.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.admin.role.policy')
@Controller({
    version: '1',
    path: '/role/:roleId/policy',
})
export class PolicyAdminController {
    constructor(
        private readonly policyListByRoleByAdminUseCase: PolicyListByRoleByAdminUseCase,
        private readonly policyCreateByAdminUseCase: PolicyCreateByAdminUseCase,
        private readonly policyUpdateByAdminUseCase: PolicyUpdateByAdminUseCase,
        private readonly policyDeleteByAdminUseCase: PolicyDeleteByAdminUseCase
    ) {}

    @Doc({ summary: 'get all policies granted by a role' })
    @Response('policy.listByRole', { schema: PolicyListResponseSchema })
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
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyListByRoleByAdminUseCase.execute(
            policyContext,
            roleId
        );
    }

    @Doc({ summary: 'grant a policy to a role' })
    @Response('policy.create', { schema: PolicySchema })
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
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Body({ schema: PolicyCreateRequestSchema })
        body: PolicyCreateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyCreateByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            roleId,
            body
        );
    }

    @Doc({ summary: 'replace a role policy' })
    @Response('policy.update', { schema: PolicySchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:policyId')
    async update(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Param('policyId', { schema: RequestUuidSchema })
        policyId: string,
        @Body({ schema: PolicyUpdateRequestSchema })
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>> {
        return this.policyUpdateByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            roleId,
            policyId,
            body
        );
    }

    @Doc({ summary: 'revoke a policy from a role' })
    @Response('policy.delete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:policyId')
    async delete(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Param('policyId', { schema: RequestUuidSchema })
        policyId: string
    ): Promise<IResponseReturn<void>> {
        return this.policyDeleteByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            roleId,
            policyId
        );
    }
}
