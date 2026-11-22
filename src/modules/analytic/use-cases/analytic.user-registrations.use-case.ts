import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import type { IAnalyticMetricCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticUserRegistrationsUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticMetricCount>
> {
    constructor(
        private readonly analyticUserService: AnalyticUserService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticMetricCount>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticUserService.getUserRegistrations(
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
