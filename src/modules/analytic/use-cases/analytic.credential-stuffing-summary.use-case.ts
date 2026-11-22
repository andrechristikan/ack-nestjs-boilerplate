import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticFraudCredentialStuffingSummary } from '@modules/analytic/interfaces/analytic.interface';
import type { AnalyticWindowRequestDto } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticCredentialStuffingSummaryUseCase implements IAppUseCase<
    [AnalyticWindowRequestDto],
    IResponseReturn<IAnalyticFraudCredentialStuffingSummary>
> {
    constructor(private readonly analyticFraudService: AnalyticFraudService) {}

    async execute(
        query: AnalyticWindowRequestDto
    ): Promise<IResponseReturn<IAnalyticFraudCredentialStuffingSummary>> {
        const data = await this.analyticFraudService.credentialStuffingSummary(
            query.windowMs ?? null
        );

        return { data };
    }
}
