import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticAnomalySummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticLoginTimeSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticAnomalySummary>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticAnomalySummary>> {
        const data = await this.analyticAnomalyService.loginTimeSummary();

        return { data };
    }
}
