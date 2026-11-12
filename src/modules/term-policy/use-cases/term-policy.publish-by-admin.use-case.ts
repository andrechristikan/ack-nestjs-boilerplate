import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyPublishByAdminUseCase implements IAppUseCase<
    [string, string, IRequestContext],
    IResponseReturn<void>
> {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    async execute(
        termPolicyId: string,
        updatedBy: string,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyService.publishByAdmin(
            termPolicyId,
            updatedBy,
            context
        );

        return {};
    }
}
