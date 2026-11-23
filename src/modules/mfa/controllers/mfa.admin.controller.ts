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
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import { MfaResetByAdminUseCase } from '@modules/mfa/use-cases/mfa.reset-by-admin.use-case';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserContext,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Controller, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.mfa')
@Controller({
    version: '1',
    path: '/mfa',
})
export class MfaAdminController {
    constructor(
        private readonly mfaResetByAdminUseCase: MfaResetByAdminUseCase
    ) {}

    @Doc({ summary: 'reset multi-factor authentication of user' })
    @Response('mfa.resetByAdmin')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/reset/:userId')
    async resetByAdmin(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponseReturn<void>> {
        return this.mfaResetByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            policyContext,
            userId
        );
    }
}
