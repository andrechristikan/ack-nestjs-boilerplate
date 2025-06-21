import { Module } from '@nestjs/common';
import { TermsPolicyRepositoryModule } from '@modules/terms-policy/repository/terms-policy.repository.module';
import { TermsPolicyService } from '@modules/terms-policy/services/terms-policy.service';
import { TermsPolicyAcceptanceService } from '@modules/terms-policy/services/terms-policy-acceptance.service';
import { TermsPolicyUserService } from '@modules/terms-policy/services/terms-policy-user.service';

@Module({
  imports: [TermsPolicyRepositoryModule],
  exports: [
    TermsPolicyService,
    TermsPolicyAcceptanceService,
    TermsPolicyUserService,
  ],
  providers: [
    TermsPolicyService,
    TermsPolicyAcceptanceService,
    TermsPolicyUserService,
  ],
})
export class TermsPolicyModule {
}