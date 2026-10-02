import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepositoryModule } from '@modules/policy/policy.repository.module';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';

@Global()
@Module({
    providers: [PolicyAbilityFactory, PolicyAbilityDomain, PolicyDomain],
    exports: [PolicyDomain, PolicyAbilityDomain, PolicyAbilityFactory],
    imports: [PolicyRepositoryModule],
})
export class PolicyDomainModule {}
