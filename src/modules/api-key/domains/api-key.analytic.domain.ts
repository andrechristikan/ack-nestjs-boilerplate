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

    async getActiveExpired(now: Date): Promise<IAnalyticApiKeyActiveExpired> {
        const [active, expired, inactive] = await Promise.all([
            this.apiKeyAnalyticRepository.countActive(now),
            this.apiKeyAnalyticRepository.countExpired(now),
            this.apiKeyAnalyticRepository.countInactive(),
        ]);
        return { active, expired, inactive };
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
