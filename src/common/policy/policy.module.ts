import { DynamicModule, Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from 'src/common/policy/factories/policy.factory';

@Global()
@Module({})
export class PolicyModule {
    static forRoot(): DynamicModule {
        return {
            module: PolicyModule,
            providers: [PolicyAbilityFactory],
            exports: [PolicyAbilityFactory],
            imports: [],
        };
    }
}
