import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepositoryModule } from '@modules/policy/policy.repository.module';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyUtil } from '@modules/policy/utils/policy.util';

@Global()
@Module({
    providers: [PolicyAbilityFactory, PolicyDomain, PolicyUtil],
    exports: [PolicyDomain, PolicyAbilityFactory, PolicyUtil],
    imports: [PolicyRepositoryModule],
})
export class PolicyDomainModule {}
