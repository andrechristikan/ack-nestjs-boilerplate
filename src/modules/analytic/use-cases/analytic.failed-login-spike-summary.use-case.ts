import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticAnomalyFailedLoginSpikeSummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticFailedLoginSpikeSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticAnomalyFailedLoginSpikeSummary>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService
    ) {}

    async execute(): Promise<
        IResponseReturn<IAnalyticAnomalyFailedLoginSpikeSummary>
    > {
        const data =
            await this.analyticAnomalyService.failedLoginSpikeSummary();

        return { data };
    }
}
