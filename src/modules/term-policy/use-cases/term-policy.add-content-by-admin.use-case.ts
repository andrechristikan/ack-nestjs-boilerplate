import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';

@Injectable()
export class TermPolicyAddContentByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, TermPolicyContentRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

    async execute(
        context: IRequestContextUser,
        termPolicyId: string,
        body: TermPolicyContentRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentService.addContentByAdmin(
            context.snapshot,
            termPolicyId,
            body
        );

        return {};
    }
}
