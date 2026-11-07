import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticTermPolicyTimeToAccept } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticTermPoliciesTimeToAcceptUseCase implements IAppUseCase<
    [AnalyticOptionalDateRangeRequestDto],
    IResponseReturn<IAnalyticTermPolicyTimeToAccept>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyTimeToAccept>> {
        const range = this.analyticDateService.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data =
            await this.analyticDashboardService.termPoliciesTimeToAccept(
                range.startDate,
                range.endDate
            );

        return { data };
    }
}
