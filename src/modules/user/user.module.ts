import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { AwsModule } from '@common/aws/aws.module';
import { DeviceModule } from '@modules/device/device.module';
import { EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserQueueFactory } from '@modules/user/factories/user.queue.factory';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserForgotPasswordRepository } from '@modules/user/repositories/user.forgot-password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserSocialRepository } from '@modules/user/repositories/user.social.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { MfaModule } from '@modules/mfa/mfa.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        UserRepository,
        UserForgotPasswordRepository,
        UserVerificationRepository,
        UserMobileNumberRepository,
        UserSocialRepository,
        UserService,
        UserAuthService,
        UserImportService,
        UserPasswordService,
        UserVerificationService,
        UserProfileService,
        UserRegistrationService,
        UserMobileNumberService,
        UserSocialService,
        UserUtil,
        UserCreateUtil,
        UserVerificationUtil,
        UserQueue,
        {
            provide: EnumUserQueue.user,
            useExisting: UserQueue,
        },
    ],
    exports: [
        UserService,
        UserAuthService,
        UserImportService,
        UserPasswordService,
        UserVerificationService,
        UserProfileService,
        UserRegistrationService,
        UserMobileNumberService,
        UserSocialService,
        UserCreateUtil,
        UserUtil,
        UserVerificationUtil,
        UserQueue,
    ],
    imports: [
        ActivityLogModule,
        AwsModule,
        DeviceModule,
        MfaModule,
        NotificationModule,
        PasswordHistoryModule,
        BullModule.registerQueueAsync({
            name: EnumUserQueue.user,
            useClass: UserQueueFactory,
        }),
    ],
})
export class UserModule {}
