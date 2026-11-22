import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import type { IAnalyticLockoutMetrics } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthLockoutUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticLockoutMetrics>
> {
    constructor(
        private readonly analyticAuthService: AnalyticAuthService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticLockoutMetrics>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticAuthService.getAuthLockout(
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
