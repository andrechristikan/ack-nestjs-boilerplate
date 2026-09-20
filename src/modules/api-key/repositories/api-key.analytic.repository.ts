import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IApiKeyAnalyticRepository } from '@modules/api-key/interfaces/api-key.analytic-repository.interface';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyAnalyticRepository implements IApiKeyAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.apiKey.count({
            where: { createdAt: { gte: startDate, lt: endDate } },
        });
    }

    async countActive(): Promise<number> {
        return this.databaseService.client.apiKey.count({
            where: { isActive: true },
        });
    }

    async countExpired(): Promise<number> {
        const now = this.helperDateService.create();
        return this.databaseService.client.apiKey.count({
            where: {
                OR: [{ endAt: { lt: now } }, { isActive: false }],
            },
        });
    }

    async groupByType(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.apiKey.groupBy({
            by: ['type'],
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.type, count: r._count._all }));
    }

    async findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IApiKeyAnalyticCreated[]> {
        return this.databaseService.client.apiKey.findMany({
            where: { createdAt: { gte: startDate, lt: endDate } },
            select: {
                id: true,
                type: true,
                createdAt: true,
                createdBy: true,
            },
        });
    }
}
