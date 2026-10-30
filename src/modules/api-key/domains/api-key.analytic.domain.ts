import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticCountBucket,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyAnalyticDomain {
    constructor(
        private readonly apiKeyAnalyticRepository: ApiKeyAnalyticRepository
    ) {}

    async getActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const [active, expired] = await Promise.all([
            this.apiKeyAnalyticRepository.countActive(),
            this.apiKeyAnalyticRepository.countExpired(),
        ]);
        return { active, expired };
    }

    getTypeMix(): Promise<IAnalyticCountBucket[]> {
        return this.apiKeyAnalyticRepository.groupByType();
    }

    getCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IApiKeyAnalyticCreated[]> {
        return this.apiKeyAnalyticRepository.findCreatedInRange(
            startDate,
            endDate
        );
    }
}
