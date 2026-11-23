import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.ability.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';

/** Shared module: PolicyService and PolicyAbilityService for the policy guards and use cases. */
@Global()
@Module({})
export class PolicyModule {
    static forRoot(): DynamicModule {
        return {
            module: PolicyModule,
            controllers: [],
            providers: [
                PolicyRepository,
                PolicyAbilityFactory,
                PolicyAbilityService,
                PolicyCache,
                PolicyService,
                PolicyUtil,
            ],
            exports: [PolicyService, PolicyAbilityService, PolicyUtil],
            imports: [],
        };
    }
}
