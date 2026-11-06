import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticCountBucket,
} from '@modules/analytic/interfaces/analytic.interface';
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

    async getTypeMix(): Promise<IAnalyticCountBucket[]> {
        return await this.apiKeyAnalyticRepository.groupByType();
    }
}
