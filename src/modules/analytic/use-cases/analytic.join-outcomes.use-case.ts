import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import type { IAnalyticStatusCountList } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class AnalyticJoinOutcomesUseCase implements IAppUseCase<
    [IWorkspaceContext, AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticStatusCountList>
> {
    constructor(
        private readonly analyticWorkspaceService: AnalyticWorkspaceService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        { startDate, endDate }: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const statuses = await this.analyticWorkspaceService.joinOutcomes(
            workspaceContext.workspace.id,
            range.startDate,
            range.endDate
        );

        return { data: { statuses } };
    }
}
