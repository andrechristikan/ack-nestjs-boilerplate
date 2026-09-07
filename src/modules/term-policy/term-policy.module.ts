import { AwsModule } from '@common/aws/aws.module';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { TermPolicyRepositoryModule } from '@modules/term-policy/term-policy.repository.module';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Global, Module } from '@nestjs/common';

/** Global module exposing term-policy domain services for acceptance guards and seeding. */
@Global()
@Module({
    controllers: [],
    providers: [
        TermPolicyService,
        TermPolicyContentService,
        TermPolicyAcceptanceService,
        TermPolicyTemplateService,
        TermPolicyUtil,
    ],
    exports: [
        TermPolicyService,
        TermPolicyContentService,
        TermPolicyAcceptanceService,
        TermPolicyTemplateService,
        TermPolicyUtil,
    ],
    imports: [TermPolicyRepositoryModule, AwsModule],
})
export class TermPolicyModule {}
