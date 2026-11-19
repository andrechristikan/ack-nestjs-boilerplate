import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticTermPolicyService } from '@modules/analytic/services/analytic.term-policy.service';
import type { IAnalyticTermPolicyAcceptanceRate } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticTermPoliciesAcceptanceRateUseCase implements IAppUseCase<
    [AnalyticOptionalDateRangeRequestDto],
    IResponseReturn<IAnalyticTermPolicyAcceptanceRate>
> {
    constructor(
        private readonly analyticTermPolicyService: AnalyticTermPolicyService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute(
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticTermPolicyAcceptanceRate>> {
        const range = this.analyticDateService.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data =
            await this.analyticTermPolicyService.termPoliciesAcceptanceRate(
                range.startDate,
                range.endDate
            );

        return { data };
    }
}
