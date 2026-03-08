import { Global, Module } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { AwsModule } from '@common/aws/aws.module';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

@Global()
@Module({
    imports: [AwsModule],
    providers: [
        TermPolicyService,
        TermPolicyTemplateService,
        TermPolicyRepository,
        TermPolicyUtil,
    ],
    exports: [
        TermPolicyService,
        TermPolicyTemplateService,
        TermPolicyRepository,
        TermPolicyUtil,
    ],
})
export class TermPolicyModule {}
