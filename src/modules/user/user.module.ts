import { AwsModule } from '@common/aws/aws.module';
import { EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserQueueFactory } from '@modules/user/factories/user.queue.factory';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserAnalyticRepository } from '@modules/user/repositories/user.analytic.repository';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';
import { UserMobileNumberAnalyticRepository } from '@modules/user/repositories/user.mobile-number.analytic.repository';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorAnalyticRepository } from '@modules/user/repositories/user.two-factor.analytic.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserVerificationAnalyticRepository } from '@modules/user/repositories/user.verification.analytic.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserAnalyticService } from '@modules/user/services/user.analytic.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserForgotPasswordAnalyticService } from '@modules/user/services/user.forgot-password.analytic.service';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserMobileNumberAnalyticService } from '@modules/user/services/user.mobile-number.analytic.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserPasswordAnalyticService } from '@modules/user/services/user.password.analytic.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorAnalyticService } from '@modules/user/services/user.two-factor.analytic.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserVerificationAnalyticService } from '@modules/user/services/user.verification.analytic.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserPasswordUtil } from '@modules/user/utils/user.password.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserRepository,
        UserPasswordRepository,
        UserVerificationRepository,
        UserTwoFactorRepository,
        UserMobileNumberRepository,
        UserAnalyticRepository,
        UserForgotPasswordAnalyticRepository,
        UserTwoFactorAnalyticRepository,
        UserVerificationAnalyticRepository,
        UserMobileNumberAnalyticRepository,
        UserService,
        UserAuthService,
        UserImportService,
        UserPasswordService,
        UserVerificationService,
        UserTwoFactorService,
        UserProfileService,
        UserMobileNumberService,
        UserUtil,
        UserCreateUtil,
        UserVerificationUtil,
        UserPasswordUtil,
        UserAnalyticService,
        UserPasswordAnalyticService,
        UserForgotPasswordAnalyticService,
        UserTwoFactorAnalyticService,
        UserVerificationAnalyticService,
        UserMobileNumberAnalyticService,
        UserQueue,
    ],
    exports: [
        UserService,
        UserAuthService,
        UserImportService,
        UserPasswordService,
        UserVerificationService,
        UserTwoFactorService,
        UserProfileService,
        UserMobileNumberService,
        UserCreateUtil,
        UserUtil,
        UserVerificationUtil,
        UserPasswordUtil,
        UserAnalyticService,
        UserPasswordAnalyticService,
        UserForgotPasswordAnalyticService,
        UserTwoFactorAnalyticService,
        UserVerificationAnalyticService,
        UserMobileNumberAnalyticService,
        UserQueue,
    ],
    imports: [
        AwsModule,
        BullModule.registerQueueAsync({
            name: EnumUserQueue.user,
            useClass: UserQueueFactory,
        }),
    ],
})
export class UserModule {}
