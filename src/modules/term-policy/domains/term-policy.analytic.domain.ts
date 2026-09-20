import { TermPolicyAnalyticRepository } from '@modules/term-policy/repositories/term-policy.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAnalyticDomain {
    constructor(
        private readonly termPolicyAnalyticRepository: TermPolicyAnalyticRepository
    ) {}

    countPublished(): Promise<number> {
        return this.termPolicyAnalyticRepository.countPublished();
    }
}
