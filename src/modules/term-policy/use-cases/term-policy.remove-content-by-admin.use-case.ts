import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';

@Injectable()
export class TermPolicyRemoveContentByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, TermPolicyRemoveContentRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService
    ) {}

    async execute(
        context: IRequestContextUser,
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyContentService.removeContentByAdmin(
            context.snapshot,
            termPolicyId,
            language
        );

        return {};
    }
}
