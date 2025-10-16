import { Module } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

@Module({
    imports: [],
    exports: [TermPolicyService, TermPolicyRepository, TermPolicyUtil],
    providers: [TermPolicyService, TermPolicyRepository, TermPolicyUtil],
})
export class TermPolicyModule {}
