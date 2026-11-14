import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyDeleteByAdminUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, string],
    IResponseReturn<TermPolicy>
> {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicy>> {
        const deleted = await this.termPolicyService.deleteByAdmin(
            requestContext,
            apiKeyContext,
            authContext,
            termPolicyId
        );

        return { data: deleted };
    }
}
