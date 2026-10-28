import { TermPolicyProcessor } from '@modules/term-policy/processors/term-policy.processor';
import { TermPolicyProcessorService } from '@modules/term-policy/services/term-policy.processor.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [TermPolicyProcessor, TermPolicyProcessorService],
    exports: [],
    imports: [],
})
export class TermPolicyProcessorModule {}
