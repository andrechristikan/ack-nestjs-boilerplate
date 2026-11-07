import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticPasswordExpiry } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthPasswordExpiryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticPasswordExpiry>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticPasswordExpiry>> {
        const data = await this.analyticDashboardService.authPasswordExpiry();

        return { data };
    }
}
