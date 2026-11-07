import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticStatusCountList } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticWorkspacesInviteFunnelUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticStatusCountList>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticStatusCountList>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const statuses =
            await this.analyticDashboardService.workspacesInviteFunnel(
                range.startDate,
                range.endDate
            );

        return { data: { statuses } };
    }
}
