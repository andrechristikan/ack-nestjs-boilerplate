import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type {
    IAnalyticTermPolicyAcceptanceCounts,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
} from '@modules/analytic/interfaces/analytic.interface';
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

    async getAcceptanceCounts(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceCounts> {
        const [acceptances, published] = await Promise.all([
            this.termPolicyAcceptanceAnalyticRepository.countAcceptances(
                startDate,
                endDate
            ),
            this.termPolicyAnalyticDomain.getCountPublished(),
        ]);
        return { acceptances, published };
    }

    mapAcceptanceRate(
        { acceptances, published }: IAnalyticTermPolicyAcceptanceCounts,
        activeUserCount: number
    ): IAnalyticTermPolicyAcceptanceRate {
        const expected = activeUserCount * published;
        const rate = this.helperNumberService.percent(acceptances, expected);
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
