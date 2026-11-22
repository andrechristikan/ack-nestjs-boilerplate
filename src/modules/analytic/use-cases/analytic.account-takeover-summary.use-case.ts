import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticFraudSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAccountTakeoverSummaryUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticFraudSummary>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticFraudSummary>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticFraudService.accountTakeoverSummary(
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
