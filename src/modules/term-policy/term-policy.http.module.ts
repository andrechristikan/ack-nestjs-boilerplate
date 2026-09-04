import { TermPolicyAcceptanceHttpService } from '@modules/term-policy/services/term-policy.acceptance.http.service';
import { TermPolicyContentHttpService } from '@modules/term-policy/services/term-policy.content.http.service';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { TermPolicyUtilModule } from '@modules/term-policy/term-policy.util.module';
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
    imports: [TermPolicyModule, TermPolicyUtilModule],
})
export class TermPolicyHttpModule {}
