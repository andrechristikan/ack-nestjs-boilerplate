import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [TermPolicyRepository],
    exports: [TermPolicyRepository],
    imports: [],
})
export class TermPolicyRepositoryModule {}
