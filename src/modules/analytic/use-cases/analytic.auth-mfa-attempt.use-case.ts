import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticMfaAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthMfaAttemptUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticMfaAttemptSnapshot>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticMfaAttemptSnapshot>> {
        const data = await this.analyticDashboardService.authMfaAttempt();

        return { data };
    }
}
