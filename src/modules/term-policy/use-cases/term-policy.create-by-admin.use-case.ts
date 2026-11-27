import { AppBaseException } from '@app/exceptions/app.base.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyCreateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        TermPolicyCreateRequestDto,
    ],
    IResponseReturn<TermPolicy>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyContentService: TermPolicyContentService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        body: TermPolicyCreateRequestDto
    ): Promise<IResponseReturn<TermPolicy>> {
        const termPolicyId = this.databaseUtil.createId();

        const { checks, readFailure } =
            await this.termPolicyService.prepareCreateByAdmin(body);

        const isRejected = this.termPolicyUtil.isContentRejected(checks);
        if (isRejected) {
            await this.databaseService.withTransaction(async tx =>
                this.termPolicyContentService.deleteRejectedContentInTx(
                    tx,
                    checks
                )
            );
        }
        if (readFailure instanceof AppBaseException) {
            throw readFailure;
        }
        this.termPolicyContentService.assertContentSizeAllowed(checks);
        this.termPolicyContentService.assertContentTypeValid(checks);

        const created = await this.databaseService.withTransaction(async tx =>
            this.termPolicyService.createByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                termPolicyId,
                body,
                checks.map(({ content }) => content)
            )
        );

        return { data: created };
    }
}
