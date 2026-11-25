import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyUserAcceptUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        TermPolicyAcceptRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        const latest =
            await this.termPolicyAcceptanceService.getLatestPublishedByType(
                type
            );

        await this.databaseService.withTransaction(async tx =>
            this.termPolicyAcceptanceService.userAcceptInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                latest
            )
        );

        return {};
    }
}
