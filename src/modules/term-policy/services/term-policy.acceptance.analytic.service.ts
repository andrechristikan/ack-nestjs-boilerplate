import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type {
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
} from '@modules/analytic/interfaces/analytic.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyAcceptanceAnalytic } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAnalyticService } from '@modules/term-policy/services/term-policy.analytic.service';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAcceptanceAnalyticService {
    constructor(
        private readonly termPolicyAcceptanceAnalyticRepository: TermPolicyAcceptanceAnalyticRepository,
        private readonly termPolicyAnalyticService: TermPolicyAnalyticService,
        private readonly helperNumberService: HelperNumberService
    ) {}

    private averageAcceptanceMs(
        rows: ITermPolicyAcceptanceAnalytic[]
    ): IAnalyticTermPolicyTimeToAccept {
        const deltas = rows.flatMap(row =>
            row.publishedAt === null
                ? []
                : [row.acceptedAt.getTime() - row.publishedAt.getTime()]
        );
        if (deltas.length === 0) {
            return { count: 0, averageMs: 0 };
        }

        const averageMs = deltas.reduce((s, d) => s + d, 0) / deltas.length;

        return { count: deltas.length, averageMs };
    }

    async getAcceptanceRate(
        activeUserCount: number,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const latest =
            await this.termPolicyAnalyticService.getLatestPublishedByTypes(
                TermPolicyDefaultRequiredTypes
            );
        const published = latest.length;
        let acceptances = 0;
        if (published > 0) {
            acceptances =
                await this.termPolicyAcceptanceAnalyticRepository.countAcceptances(
                    latest,
                    startDate,
                    endDate
                );
        }
        const rate = this.helperNumberService.percent(
            acceptances,
            activeUserCount * published
        );

        return { acceptances, users: activeUserCount, published, rate };
    }

    async getTimeToAccept(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        const rows =
            await this.termPolicyAcceptanceAnalyticRepository.findAcceptances(
                startDate,
                endDate
            );

        return this.averageAcceptanceMs(rows);
    }
}
