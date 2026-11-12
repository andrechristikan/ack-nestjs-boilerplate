import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyUserAcceptUseCase implements IAppUseCase<
    [IUser, TermPolicyAcceptRequestDto, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService
    ) {}

    async execute(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyAcceptanceService.userAccept(
            user.id,
            type,
            context
        );

        return {};
    }
}
