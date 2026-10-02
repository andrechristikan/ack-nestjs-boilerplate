import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepositoryModule } from '@modules/policy/policy.repository.module';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyUtil } from '@modules/policy/utils/policy.util';

@Global()
@Module({
    providers: [
        PolicyAbilityFactory,
        PolicyAbilityDomain,
        PolicyDomain,
        PolicyUtil,
    ],
    exports: [
        PolicyDomain,
        PolicyAbilityDomain,
        PolicyAbilityFactory,
        PolicyUtil,
    ],
    imports: [PolicyRepositoryModule],
})
export class PolicyDomainModule {}
