import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { Module } from '@nestjs/common';
import { TermPolicyAnalyticRepository } from '@modules/term-policy/repositories/term-policy.analytic.repository';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';

@Module({
    controllers: [],
    providers: [
        TermPolicyRepository,
        TermPolicyAnalyticRepository,
        TermPolicyAcceptanceAnalyticRepository,
    ],
    exports: [
        TermPolicyRepository,
        TermPolicyAnalyticRepository,
        TermPolicyAcceptanceAnalyticRepository,
    ],
    imports: [],
})
export class TermPolicyRepositoryModule {}
