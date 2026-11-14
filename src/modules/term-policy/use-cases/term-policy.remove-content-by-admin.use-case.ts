import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyRemoveContentByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        TermPolicyRemoveContentRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentService.removeContentByAdmin(
            requestContext,
            apiKeyContext,
            authContext,
            termPolicyId,
            language
        );

        return {};
    }
}
