import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type {
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
} from '@modules/analytic/interfaces/analytic.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAnalyticDomain } from '@modules/term-policy/domains/term-policy.analytic.domain';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAcceptanceAnalyticDomain {
    constructor(
        private readonly termPolicyAcceptanceAnalyticRepository: TermPolicyAcceptanceAnalyticRepository,
        private readonly termPolicyAnalyticDomain: TermPolicyAnalyticDomain,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getAcceptanceRate(
        activeUserCount: number,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        const latest =
            await this.termPolicyAnalyticDomain.getLatestPublishedByTypes(
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

        return this.termPolicyUtil.averageAcceptanceMs(rows);
    }
}
