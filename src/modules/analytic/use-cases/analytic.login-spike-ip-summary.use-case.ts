import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticAnomalyLoginSpikeIpSummary } from '@modules/analytic/interfaces/analytic.interface';
import type { AnalyticWindowRequestDto } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticLoginSpikeIpSummaryUseCase implements IAppUseCase<
    [AnalyticWindowRequestDto],
    IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService
    ) {}

    async execute(
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticAnomalyLoginSpikeIpSummary>> {
        const data = await this.analyticAnomalyService.loginSpikeIpSummary(
            query.windowMs ?? null
        );

        return { data };
    }
}
