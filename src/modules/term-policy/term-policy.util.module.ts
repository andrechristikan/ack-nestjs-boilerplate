import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [TermPolicyUtil],
    exports: [TermPolicyUtil],
    imports: [],
})
export class TermPolicyUtilModule {}
