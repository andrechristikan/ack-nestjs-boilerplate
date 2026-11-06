import { AwsModule } from '@common/aws/aws.module';
import { BullModule } from '@nestjs/bullmq';
import { UserQueueFactory } from '@modules/user/factories/user.queue.factory';
import { UserQueue } from '@modules/user/queues/user.queue';
import { QueueConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserRepositoryModule } from '@modules/user/user.repository.module';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserPasswordUtil } from '@modules/user/utils/user.password.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Module } from '@nestjs/common';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';
import { UserPasswordAnalyticDomain } from '@modules/user/domains/user.password.analytic.domain';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserTwoFactorAnalyticDomain } from '@modules/user/domains/user.two-factor.analytic.domain';
import { UserVerificationAnalyticDomain } from '@modules/user/domains/user.verification.analytic.domain';
import { UserMobileNumberAnalyticDomain } from '@modules/user/domains/user.mobile-number.analytic.domain';

@Module({
    controllers: [],
    providers: [
        UserDomain,
        UserAuthDomain,
        UserImportDomain,
        UserPasswordDomain,
        UserVerificationDomain,
        UserTwoFactorDomain,
        UserProfileDomain,
        UserMobileNumberDomain,
        UserUtil,
        UserCreateUtil,
        UserVerificationUtil,
        UserPasswordUtil,
        UserAnalyticDomain,
        UserPasswordAnalyticDomain,
        UserForgotPasswordAnalyticDomain,
        UserTwoFactorAnalyticDomain,
        UserVerificationAnalyticDomain,
        UserMobileNumberAnalyticDomain,
        UserQueue,
    ],
    exports: [
        BullModule,
        UserDomain,
        UserAuthDomain,
        UserImportDomain,
        UserPasswordDomain,
        UserVerificationDomain,
        UserTwoFactorDomain,
        UserProfileDomain,
        UserMobileNumberDomain,
        UserCreateUtil,
        UserUtil,
        UserVerificationUtil,
        UserPasswordUtil,
        UserAnalyticDomain,
        UserPasswordAnalyticDomain,
        UserForgotPasswordAnalyticDomain,
        UserTwoFactorAnalyticDomain,
        UserVerificationAnalyticDomain,
        UserMobileNumberAnalyticDomain,
        UserQueue,
    ],
    imports: [
        UserRepositoryModule,
        AwsModule,
        BullModule.registerQueueAsync({
            name: EnumQueue.user,
            configKey: QueueConfigKey,
            useClass: UserQueueFactory,
        }),
    ],
})
export class UserDomainModule {}
