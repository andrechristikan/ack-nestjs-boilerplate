import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticAnomalyImpossibleTravelSummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticImpossibleTravelSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticAnomalyImpossibleTravelSummary>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService
    ) {}

    async execute(): Promise<
        IResponseReturn<IAnalyticAnomalyImpossibleTravelSummary>
    > {
        const data =
            await this.analyticAnomalyService.impossibleTravelSummary();

        return { data };
    }
}
