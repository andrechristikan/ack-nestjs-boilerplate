import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import type { IAnalyticMfaAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthMfaAttemptUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticMfaAttemptSnapshot>
> {
    constructor(private readonly analyticAuthService: AnalyticAuthService) {}

    async execute(): Promise<IResponseReturn<IAnalyticMfaAttemptSnapshot>> {
        const data = await this.analyticAuthService.authMfaAttempt();

        return { data };
    }
}
