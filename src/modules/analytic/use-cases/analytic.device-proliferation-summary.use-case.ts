import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticAnomalyDeviceProliferationSummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDeviceProliferationSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticAnomalyDeviceProliferationSummary>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService
    ) {}

    async execute(): Promise<
        IResponseReturn<IAnalyticAnomalyDeviceProliferationSummary>
    > {
        const data =
            await this.analyticAnomalyService.deviceProliferationSummary();

        return { data };
    }
}
