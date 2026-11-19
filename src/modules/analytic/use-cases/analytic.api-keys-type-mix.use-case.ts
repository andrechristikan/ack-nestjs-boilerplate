import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticApiKeyService } from '@modules/analytic/services/analytic.api-key.service';
import type { IAnalyticBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticApiKeysTypeMixUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticBucketsResult>
> {
    constructor(
        private readonly analyticApiKeyService: AnalyticApiKeyService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data = await this.analyticApiKeyService.apiKeysTypeMix();

        return { data };
    }
}
