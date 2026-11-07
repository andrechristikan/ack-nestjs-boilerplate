import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticMetricCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticActivityUseCase implements IAppUseCase<
    [string, AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticMetricCount>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute(
        workspaceId: string,
        { startDate, endDate }: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticWorkspaceUserService.activity(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
