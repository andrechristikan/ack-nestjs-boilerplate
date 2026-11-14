import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { AwsModule } from '@common/aws/aws.module';
import { FirebaseModule } from '@common/firebase/firebase.module';
import { DeviceModule } from '@modules/device/device.module';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueueFactory } from '@modules/notification/factories/notification.email.queue.factory';
import { NotificationPushQueueFactory } from '@modules/notification/factories/notification.push.queue.factory';
import { NotificationQueueFactory } from '@modules/notification/factories/notification.queue.factory';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationTemplateService } from '@modules/notification/services/notification.template.service';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationRepository,
        NotificationUserSettingRepository,
        NotificationService,
        NotificationTemplateService,
        NotificationTermPolicyService,
        NotificationEmailDeliveryService,
        NotificationEmailTermPolicyService,
        NotificationPushDeliveryService,
        NotificationPushQueue,
        NotificationUtil,
    ],
    exports: [
        NotificationService,
        NotificationTemplateService,
        NotificationTermPolicyService,
        NotificationEmailTermPolicyService,
        NotificationEmailDeliveryService,
        NotificationPushDeliveryService,
        NotificationUtil,
    ],
    imports: [
        ActivityLogModule,
        DeviceModule,
        AwsModule,
        FirebaseModule,
        BullModule.registerQueueAsync(
            {
                name: EnumNotificationQueue.notification,
                useClass: NotificationQueueFactory,
            },
            {
                name: EnumNotificationQueue.notificationEmail,
                useClass: NotificationEmailQueueFactory,
            },
            {
                name: EnumNotificationQueue.notificationPush,
                useClass: NotificationPushQueueFactory,
            }
        ),
    ],
})
export class NotificationModule {}
