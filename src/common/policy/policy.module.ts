import { Global, Module } from '@nestjs/common';
import { PolicyAbilityFactory } from 'src/common/policy/factories/policy.ability.factory';

@Global()
@Module({
    providers: [PolicyAbilityFactory],
    exports: [PolicyAbilityFactory],
    imports: [],
})
export class PolicyModule {}
