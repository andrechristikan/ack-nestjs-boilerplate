import { AwsModule } from '@common/aws/aws.module';
import { DeviceModule } from '@modules/device/device.module';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserModule } from '@modules/user/user.module';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    imports: [UserModule, DeviceModule, AwsModule],
    exports: [
        NotificationService,
        NotificationProcessorService,
        NotificationEmailProcessorService,
        NotificationPushProcessorService,
        NotificationRepository,
        NotificationUtil,
        NotificationEmailUtil,
        NotificationPushUtil,
    ],
    providers: [
        NotificationService,
        NotificationProcessorService,
        NotificationEmailProcessorService,
        NotificationPushProcessorService,
        NotificationRepository,
        NotificationUtil,
        NotificationEmailUtil,
        NotificationPushUtil,
    ],
    controllers: [],
})
export class NotificationModule {}

// TODO: INIT
// - complete logic in notification processor service
// - which part of notification that needs to be registered to firebase
// - which part of notification that need to be revoked
// - test notification is working end to end
// - implement log out api
// - update and complete docs
// - ignore delivery status and outbox event design pattern for now
