import { Module } from '@nestjs/common';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

@Module({
    imports: [],
    providers: [TermPolicyRepository, TermPolicyUtil],
    exports: [TermPolicyRepository, TermPolicyUtil],
})
export class TermPolicySharedModule {}
