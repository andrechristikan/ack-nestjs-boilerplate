import { DatabaseService } from '@common/database/services/database.service';
import type { ITermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/interfaces/term-policy.acceptance-analytic-repository.interface';
import type { ITermPolicyAcceptanceAnalytic } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAcceptanceAnalyticRepository implements ITermPolicyAcceptanceAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        return this.databaseService.client.termPolicyUserAcceptance.count({
            where:
                startDate && endDate
                    ? { acceptedAt: { gte: startDate, lt: endDate } }
                    : {},
        });
    }

    async findAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<ITermPolicyAcceptanceAnalytic[]> {
        return this.databaseService.client.termPolicyUserAcceptance.findMany({
            where:
                startDate && endDate
                    ? { acceptedAt: { gte: startDate, lt: endDate } }
                    : {},
            select: {
                id: true,
                userId: true,
                termPolicyId: true,
                acceptedAt: true,
                createdAt: true,
            },
        });
    }
}
