import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticMetricCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDevicesInactivityUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticMetricCount>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const data = await this.analyticDashboardService.devicesInactivity();

        return { data };
    }
}
