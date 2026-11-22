import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticUsersRoleDistributionUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticBucketsResult>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data =
            await this.analyticDashboardService.usersRoleDistribution();

        return { data };
    }
}
