import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticUserService } from '@modules/analytic/services/analytic.user.service';
import type { IAnalyticBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticUserStatusDistributionUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticBucketsResult>
> {
    constructor(private readonly analyticUserService: AnalyticUserService) {}

    async execute(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data = await this.analyticUserService.getUserStatusDistribution();

        return { data };
    }
}
