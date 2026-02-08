import { Module } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { AwsModule } from '@common/aws/aws.module';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { TermPolicySharedModule } from '@modules/term-policy/term-policy.shared.module';

@Module({
    imports: [AwsModule, TermPolicySharedModule],
    providers: [TermPolicyService, TermPolicyTemplateService],
    exports: [TermPolicyService, TermPolicyTemplateService],
})
export class TermPolicyModule {}
