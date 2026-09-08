import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PolicyRepository],
    exports: [PolicyRepository],
    imports: [],
})
export class PolicyRepositoryModule {}
