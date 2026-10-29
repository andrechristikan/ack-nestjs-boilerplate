import { DatabaseService } from '@common/database/services/database.service';
import { EnumTermPolicyStatus } from '@generated/prisma-client/client';
import { TermPolicyAcceptanceAnalyticSelect } from '@modules/term-policy/constants/term-policy.constant';
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
            where: {
                termPolicy: { status: EnumTermPolicyStatus.published },
                ...(startDate &&
                    endDate && { acceptedAt: { gte: startDate, lt: endDate } }),
            },
        });
    }

    async findAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<ITermPolicyAcceptanceAnalytic[]> {
        const rows =
            await this.databaseService.client.termPolicyUserAcceptance.findMany(
                {
                    where:
                        startDate && endDate
                            ? { acceptedAt: { gte: startDate, lt: endDate } }
                            : {},
                    select: TermPolicyAcceptanceAnalyticSelect,
                }
            );
        return rows.map(row => ({
            id: row.id,
            userId: row.userId,
            termPolicyId: row.termPolicyId,
            acceptedAt: row.acceptedAt,
            publishedAt: row.termPolicy.publishedAt,
        }));
    }
}
