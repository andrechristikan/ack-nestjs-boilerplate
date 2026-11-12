import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

@Injectable()
export class TermPolicyCreateByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, TermPolicyCreateRequestDto],
    IResponseReturn<TermPolicy>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        context: IRequestContextUser,
        body: TermPolicyCreateRequestDto
    ): Promise<IResponseReturn<TermPolicy>> {
        const termPolicyId = this.databaseUtil.createId();
        const created = await this.termPolicyService.createByAdmin(
            context.snapshot,
            termPolicyId,
            body
        );

        return { data: created };
    }
}
