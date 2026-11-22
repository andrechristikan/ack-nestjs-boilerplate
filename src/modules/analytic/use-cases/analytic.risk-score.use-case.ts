import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticFraudRiskScore } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticRiskScoreUseCase implements IAppUseCase<
    [string],
    IResponseReturn<IAnalyticFraudRiskScore>
> {
    constructor(private readonly analyticFraudService: AnalyticFraudService) {}

    async execute(
        userId: string
    ): Promise<IResponseReturn<IAnalyticFraudRiskScore>> {
        const data = await this.analyticFraudService.riskScore(userId);

        return { data };
    }
}
