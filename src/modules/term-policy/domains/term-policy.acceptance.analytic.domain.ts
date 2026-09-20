import type {
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
} from '@modules/analytic/interfaces/analytic.interface';
import { TermPolicyAnalyticDomain } from '@modules/term-policy/domains/term-policy.analytic.domain';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAcceptanceAnalyticDomain {
    constructor(
        private readonly termPolicyAcceptanceAnalyticRepository: TermPolicyAcceptanceAnalyticRepository,
        private readonly termPolicyAnalyticDomain: TermPolicyAnalyticDomain,
        private readonly userAnalyticDomain: UserAnalyticDomain
    ) {}

    async acceptanceRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const [acceptances, users, published] = await Promise.all([
            this.termPolicyAcceptanceAnalyticRepository.countAcceptances(
                startDate,
                endDate
            ),
            this.userAnalyticDomain.countActive(),
            this.termPolicyAnalyticDomain.countPublished(),
        ]);
        const expected = users * published;
        return {
            acceptances,
            users,
            published,
            rate: expected === 0 ? 0 : (acceptances / expected) * 100,
        };
    }

    async timeToAccept(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        const rows =
            await this.termPolicyAcceptanceAnalyticRepository.findAcceptances(
                startDate,
                endDate
            );
        if (rows.length === 0) {
            return { count: 0, averageMs: 0 };
        }
        const deltas = rows.map(
            r => r.acceptedAt.getTime() - r.createdAt.getTime()
        );
        const averageMs = deltas.reduce((s, d) => s + d, 0) / deltas.length;
        return { count: rows.length, averageMs };
    }
}
