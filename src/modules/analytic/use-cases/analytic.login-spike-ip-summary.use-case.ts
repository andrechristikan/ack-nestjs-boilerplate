import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticAnomalyLoginSpikeIpSummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticLoginSpikeIpSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService
    ) {}

    async execute(): Promise<
        IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>
    > {
        const data = await this.analyticAnomalyService.loginSpikeIpSummary();

        return { data };
    }
}
