import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticFraudSummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticSharedFingerprintSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticFraudSummary>
> {
    constructor(private readonly analyticFraudService: AnalyticFraudService) {}

    async execute(): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudService.sharedFingerprintSummary();

        return { data };
    }
}
