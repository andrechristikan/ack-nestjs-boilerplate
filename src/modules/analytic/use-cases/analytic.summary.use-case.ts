import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticWorkspaceSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticSummaryUseCase implements IAppUseCase<
    [string, AnalyticOptionalDateRangeRequestDto],
    IResponseReturn<IAnalyticWorkspaceSummary>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute(
        workspaceId: string,
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        const range = this.analyticDateService.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticWorkspaceUserService.summary(
            workspaceId,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
