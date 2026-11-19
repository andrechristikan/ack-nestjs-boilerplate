import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import type { IAnalyticSnapshotBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthConcurrentSessionsUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticSnapshotBucketsResult>
> {
    constructor(private readonly analyticAuthService: AnalyticAuthService) {}

    async execute(): Promise<IResponseReturn<IAnalyticSnapshotBucketsResult>> {
        const data = await this.analyticAuthService.authConcurrentSessions();

        return { data };
    }
}
