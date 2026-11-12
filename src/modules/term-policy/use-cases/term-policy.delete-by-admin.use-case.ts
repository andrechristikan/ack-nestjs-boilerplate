import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyDeleteByAdminUseCase implements IAppUseCase<
    [string, IRequestContext],
    IResponseReturn<TermPolicy>
> {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    async execute(
        termPolicyId: string,
        context: IRequestContext
    ): Promise<IResponseReturn<TermPolicy>> {
        const deleted = await this.termPolicyService.deleteByAdmin(
            termPolicyId,
            context
        );

        return { data: deleted };
    }
}
