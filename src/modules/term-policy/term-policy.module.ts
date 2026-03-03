import { Global, Module } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { AwsModule } from '@common/aws/aws.module';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';

@Global()
@Module({
    imports: [AwsModule],
    providers: [TermPolicyService, TermPolicyTemplateService],
    exports: [TermPolicyService, TermPolicyTemplateService],
})
export class TermPolicyModule {}
