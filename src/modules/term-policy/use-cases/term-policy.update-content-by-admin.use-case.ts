import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyUpdateContentByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        TermPolicyContentRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicyId: string,
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        const prepared =
            await this.termPolicyContentService.prepareUpdateContentByAdmin(
                termPolicyId,
                body
            );

        const isRejected = this.termPolicyUtil.isContentRejected(
            prepared.checks
        );
        if (isRejected) {
            await this.databaseService.withTransaction(async tx =>
                this.termPolicyContentService.deleteRejectedContentInTx(
                    tx,
                    prepared.checks
                )
            );
        }
        this.termPolicyContentService.assertContentSizeAllowed(prepared.checks);
        this.termPolicyContentService.assertContentTypeValid(prepared.checks);

        await this.databaseService.withTransaction(async tx =>
            this.termPolicyContentService.updateContentByAdminInTx(
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
