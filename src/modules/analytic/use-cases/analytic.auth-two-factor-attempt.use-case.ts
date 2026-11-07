import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticTwoFactorAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthTwoFactorAttemptUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticTwoFactorAttemptSnapshot>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<
        IResponseReturn<IAnalyticTwoFactorAttemptSnapshot>
    > {
        const data = await this.analyticDashboardService.authTwoFactorAttempt();

        return { data };
    }
}
