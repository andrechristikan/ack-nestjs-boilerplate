import { DatabaseService } from '@common/database/services/database.service';
import type {
    ITermPolicyAcceptanceAnalyticRepository,
    ITermPolicyAcceptanceAnalyticRow,
} from '@modules/term-policy/interfaces/term-policy.acceptance.analytic.repository.interface';
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
    ): Promise<ITermPolicyAcceptanceAnalyticRow[]> {
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
