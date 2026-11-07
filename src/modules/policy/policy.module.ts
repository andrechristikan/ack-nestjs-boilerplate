import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';

/** Shared module: PolicyService for the policy guard. */
@Global()
@Module({
    controllers: [],
    providers: [
        PolicyRepository,
        PolicyAbilityFactory,
        PolicyService,
        PolicyUtil,
    ],
    exports: [PolicyService, PolicyUtil],
    imports: [],
})
export class PolicyModule {}
