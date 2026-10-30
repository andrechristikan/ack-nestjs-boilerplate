import { CountryDomainModule } from '@modules/country/country.domain.module';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

/** Composition module: the sign-up and user-creation flows that write across the user, workspace, project, password-history, notification, and term-policy modules in one transaction. */
@Module({
    controllers: [],
    providers: [OnboardingDomain],
    exports: [OnboardingDomain],
    imports: [
        CountryDomainModule,
        PasswordHistoryDomainModule,
        ProjectDomainModule,
        UserDomainModule,
        WorkspaceDomainModule,
    ],
})
export class OnboardingDomainModule {}
