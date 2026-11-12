import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyDeleteByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<TermPolicy>
> {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    async execute(
        context: IRequestContextUser,
        termPolicyId: string
    ): Promise<IResponseReturn<TermPolicy>> {
        const deleted = await this.termPolicyService.deleteByAdmin(
            context.snapshot,
            termPolicyId
        );

        return { data: deleted };
    }
}
