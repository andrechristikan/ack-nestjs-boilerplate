import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepositoryModule } from '@modules/policy/policy.repository.module';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';

@Global()
@Module({
    providers: [PolicyAbilityFactory, PolicyDomain],
    exports: [PolicyDomain],
    imports: [PolicyRepositoryModule],
})
export class PolicyDomainModule {}
