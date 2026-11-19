import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import type { IAnalyticWorkspaceSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class AnalyticSummaryUseCase implements IAppUseCase<
    [IWorkspaceContext, AnalyticOptionalDateRangeRequestDto],
    IResponseReturn<IAnalyticWorkspaceSummary>
> {
    constructor(
        private readonly analyticWorkspaceService: AnalyticWorkspaceService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        const range = this.analyticDateService.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticWorkspaceService.summary(
            workspaceContext.workspace.id,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
