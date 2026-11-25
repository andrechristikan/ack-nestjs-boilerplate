import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyRemoveContentByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        EnumMessageLanguage,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<IResponseReturn<void>> {
        const prepared =
            await this.termPolicyContentService.prepareRemoveContentByAdmin(
                termPolicyId,
                language
            );
        await this.databaseService.withTransaction(async tx =>
            this.termPolicyContentService.removeContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                prepared
            )
        );

        return {};
    }
}
