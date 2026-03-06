import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyService } from '@modules/policy/services/policy.service';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

@Global()
@Module({
    providers: [
        PolicyAbilityFactory,
        PolicyService,
        TermPolicyRepository,
        TermPolicyUtil,
    ],
    exports: [PolicyService, TermPolicyRepository, TermPolicyUtil],
    imports: [],
})
export class PolicyModule {}
