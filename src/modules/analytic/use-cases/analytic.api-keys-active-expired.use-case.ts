import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticApiKeysActiveExpiredUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticApiKeyActiveExpired>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticApiKeyActiveExpired>> {
        const data = await this.analyticDashboardService.apiKeysActiveExpired();

        return { data };
    }
}
