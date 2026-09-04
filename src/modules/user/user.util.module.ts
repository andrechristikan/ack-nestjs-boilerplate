import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [UserUtil, UserOnboardingUtil],
    exports: [UserUtil, UserOnboardingUtil],
    imports: [],
})
export class UserUtilModule {}
