import { AwsModule } from '@common/aws/aws.module';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { TermPolicyRepositoryModule } from '@modules/term-policy/term-policy.repository.module';
import { TermPolicyUtilModule } from '@modules/term-policy/term-policy.util.module';
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
    ],
    exports: [
        TermPolicyService,
        TermPolicyContentService,
        TermPolicyAcceptanceService,
        TermPolicyTemplateService,
    ],
    imports: [TermPolicyRepositoryModule, TermPolicyUtilModule, AwsModule],
})
export class TermPolicyModule {}
