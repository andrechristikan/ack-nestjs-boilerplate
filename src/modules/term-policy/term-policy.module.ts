import { Module } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyRepositoryModule } from '@modules/term-policy/repository/term-policy.repository.module';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';

@Module({
    imports: [TermPolicyRepositoryModule],
    exports: [
        TermPolicyService,
        TermPolicyAcceptanceService,
        TermPolicyTemplateService,
    ],
    providers: [
        TermPolicyService,
        TermPolicyAcceptanceService,
        TermPolicyTemplateService,
    ],
})
export class TermPolicyModule {}
