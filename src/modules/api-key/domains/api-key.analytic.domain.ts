import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticCountBucket,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

@Injectable()
export class ApiKeyAnalyticDomain {
    constructor(
        private readonly apiKeyAnalyticRepository: ApiKeyAnalyticRepository,
        private readonly activityLogAnalyticDomain: ActivityLogAnalyticDomain
    ) {}

    async lifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticApiKeyLifecycle> {
        const [created, reset, updated, deleted] = await Promise.all([
            this.activityLogAnalyticDomain.countByActionsInRange(
                [EnumActivityLogAction.adminApiKeyCreate],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.countByActionsInRange(
                [EnumActivityLogAction.adminApiKeyReset],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.countByActionsInRange(
                [
                    EnumActivityLogAction.adminApiKeyUpdate,
                    EnumActivityLogAction.adminApiKeyUpdateDate,
                    EnumActivityLogAction.adminApiKeyUpdateStatus,
                ],
                startDate,
                endDate
            ),
            this.activityLogAnalyticDomain.countByActionsInRange(
                [EnumActivityLogAction.adminApiKeyDelete],
                startDate,
                endDate
            ),
        ]);
        return { created, reset, updated, deleted };
    }

    async activeExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        const [active, expired] = await Promise.all([
            this.apiKeyAnalyticRepository.countActive(),
            this.apiKeyAnalyticRepository.countExpired(),
        ]);
        return { active, expired };
    }

    typeMix(): Promise<IAnalyticCountBucket[]> {
        return this.apiKeyAnalyticRepository.groupByType();
    }

    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IApiKeyAnalyticCreated[]> {
        return this.apiKeyAnalyticRepository.findCreatedInRange(
            startDate,
            endDate
        );
    }
}
