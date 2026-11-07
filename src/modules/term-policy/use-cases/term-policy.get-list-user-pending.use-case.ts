import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyPending } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyGetListUserPendingUseCase implements IAppUseCase<
    [string],
    IResponseReturn<ITermPolicyPending>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService
    ) {}

    async execute(
        userId: string
    ): Promise<IResponseReturn<ITermPolicyPending>> {
        const termPolicies =
            await this.termPolicyAcceptanceService.getPendingForUser(
                userId,
                TermPolicyDefaultRequiredTypes
            );
        return { data: { termPolicies } };
    }
}
