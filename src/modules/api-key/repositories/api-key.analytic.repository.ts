import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IApiKeyAnalyticRepository } from '@modules/api-key/interfaces/api-key.analytic-repository.interface';
import type { IApiKeyAnalyticCreated } from '@modules/api-key/interfaces/api-key.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyAnalyticRepository implements IApiKeyAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.apiKey.count({
            where: { createdAt: { gte: startDate, lt: endDate } },
        });
    }

    async countActive(now: Date): Promise<number> {
        return this.databaseService.client.apiKey.count({
            where: {
                isActive: true,
                OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
        });
    }

    async countExpired(now: Date): Promise<number> {
        return this.databaseService.client.apiKey.count({
            where: { isActive: true, endAt: { lt: now } },
        });
    }

    async countInactive(): Promise<number> {
        return this.databaseService.client.apiKey.count({
            where: { isActive: false },
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
