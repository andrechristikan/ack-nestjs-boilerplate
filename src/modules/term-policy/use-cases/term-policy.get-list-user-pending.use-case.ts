import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyPending } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyGetListUserPendingUseCase implements IAppUseCase<
    [IAuthJwtAccessContext],
    IResponseReturn<ITermPolicyPending>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService
    ) {}

    async execute(
        authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<ITermPolicyPending>> {
        const termPolicies =
            await this.termPolicyAcceptanceService.getPendingForUser(
                authContext.userId,
                TermPolicyDefaultRequiredTypes
            );
        return { data: { termPolicies } };
    }
}
