import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [OnboardingDomain],
    exports: [OnboardingDomain],
    imports: [UserDomainModule, WorkspaceDomainModule],
})
export class OnboardingDomainModule {}
