import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticSessionDeviceRatio } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDevicesSessionRatioUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticSessionDeviceRatio>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticSessionDeviceRatio>> {
        const data = await this.analyticDashboardService.devicesSessionRatio();

        return { data };
    }
}
