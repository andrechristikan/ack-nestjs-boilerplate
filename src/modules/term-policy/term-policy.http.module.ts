import { AccountDomainModule } from '@modules/account/account.domain.module';
import { TermPolicyAcceptanceHttpService } from '@modules/term-policy/services/term-policy.acceptance.http.service';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        TermPolicyHttpService,
        TermPolicyContentHttpService,
        TermPolicyAcceptanceHttpService,
    ],
    exports: [
        TermPolicyHttpService,
        TermPolicyContentHttpService,
        TermPolicyAcceptanceHttpService,
    ],
    imports: [AccountDomainModule],
})
export class TermPolicyHttpModule {}
