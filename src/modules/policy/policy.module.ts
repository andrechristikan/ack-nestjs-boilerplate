import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepositoryModule } from '@modules/policy/policy.repository.module';
import { PolicyService } from '@modules/policy/services/policy.service';

@Global()
@Module({
    providers: [PolicyAbilityFactory, PolicyService],
    exports: [PolicyService],
    imports: [PolicyRepositoryModule],
})
export class PolicyModule {}
