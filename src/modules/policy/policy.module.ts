import { DynamicModule, Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyService } from '@modules/policy/services/policy.service';

@Global()
@Module({})
export class PolicyModule {
    static forRoot(): DynamicModule {
        return {
            module: PolicyModule,
            providers: [PolicyAbilityFactory, PolicyService],
            exports: [PolicyService],
            imports: [],
        };
    }
}
