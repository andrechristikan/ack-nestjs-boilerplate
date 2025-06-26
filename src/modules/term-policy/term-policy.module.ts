import { Module } from '@nestjs/common';
import { TermPolicyRepositoryModule } from '@modules/term-policy/repository/term-policy-repository.module';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy-acceptance.service';
import { TermPolicyUserService } from '@modules/term-policy/services/term-policy-user.service';

@Module({
  imports: [TermPolicyRepositoryModule],
  exports: [
    TermPolicyService,
    TermPolicyAcceptanceService,
    TermPolicyUserService,
  ],
  providers: [
    TermPolicyService,
    TermPolicyAcceptanceService,
    TermPolicyUserService,
  ],
})
export class TermPolicyModule {
}