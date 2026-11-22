import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticFraudCredentialStuffingSummary } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticCredentialStuffingSummaryUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticFraudCredentialStuffingSummary>
> {
    constructor(private readonly analyticFraudService: AnalyticFraudService) {}

    async execute(): Promise<
        IResponseReturn<IAnalyticFraudCredentialStuffingSummary>
    > {
        const data =
            await this.analyticFraudService.getCredentialStuffingSummary();

        return { data };
    }
}
