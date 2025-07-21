import { Module } from '@nestjs/common';
import { TermPolicyRepositoryModule } from '@modules/term-policy/repository/term-policy-repository.module';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy-acceptance.service';

@Module({
    imports: [TermPolicyRepositoryModule],
    exports: [TermPolicyService, TermPolicyAcceptanceService],
    providers: [TermPolicyService, TermPolicyAcceptanceService],
})
export class TermPolicyModule {}
