import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticProjectCreation } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticProjectsCreationUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticProjectCreation>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticProjectCreation>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticDashboardService.projectsCreation(
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
