import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyPending } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyGetListUserPendingUseCase implements IAppUseCase<
    [IRequestContextUser],
    IResponseReturn<ITermPolicyPending>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService
    ) {}

    async execute(
        context: IRequestContextUser
    ): Promise<IResponseReturn<ITermPolicyPending>> {
        const termPolicies =
            await this.termPolicyAcceptanceService.getPendingForUser(
                context.user.id,
                TermPolicyDefaultRequiredTypes
            );
        return { data: { termPolicies } };
    }
}
