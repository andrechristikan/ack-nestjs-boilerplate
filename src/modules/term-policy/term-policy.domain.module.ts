import { AwsModule } from '@common/aws/aws.module';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyTemplateDomain } from '@modules/term-policy/domains/term-policy.template.domain';
import { TermPolicyRepositoryModule } from '@modules/term-policy/term-policy.repository.module';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Global, Module } from '@nestjs/common';
import { TermPolicyAnalyticDomain } from '@modules/term-policy/domains/term-policy.analytic.domain';
import { TermPolicyAcceptanceAnalyticDomain } from '@modules/term-policy/domains/term-policy.acceptance.analytic.domain';

/** Global module exposing term-policy domain services for acceptance guards and seeding. */
@Global()
@Module({
    controllers: [],
    providers: [
        TermPolicyDomain,
        TermPolicyContentDomain,
        TermPolicyAcceptanceDomain,
        TermPolicyTemplateDomain,
        TermPolicyUtil,
        TermPolicyAnalyticDomain,
        TermPolicyAcceptanceAnalyticDomain,
    ],
    exports: [
        TermPolicyDomain,
        TermPolicyContentDomain,
        TermPolicyAcceptanceDomain,
        TermPolicyTemplateDomain,
        TermPolicyUtil,
        TermPolicyAnalyticDomain,
        TermPolicyAcceptanceAnalyticDomain,
    ],
    imports: [TermPolicyRepositoryModule, AwsModule, UserDomainModule],
})
export class TermPolicyDomainModule {}
