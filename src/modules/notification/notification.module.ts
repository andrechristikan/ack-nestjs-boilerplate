import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { AwsModule } from '@common/aws/aws.module';
import { FirebaseModule } from '@common/firebase/firebase.module';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueueFactory } from '@modules/notification/factories/notification.email.queue.factory';
import { NotificationPushQueueFactory } from '@modules/notification/factories/notification.push.queue.factory';
import { NotificationQueueFactory } from '@modules/notification/factories/notification.queue.factory';
import { NotificationSmsQueueFactory } from '@modules/notification/factories/notification.sms.queue.factory';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationSmsQueue } from '@modules/notification/queues/notification.sms.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationSmsDeliveryService } from '@modules/notification/services/notification.sms.delivery.service';
import { NotificationTemplateService } from '@modules/notification/services/notification.template.service';
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
        NotificationEmailDeliveryService,
        NotificationPushDeliveryService,
        NotificationSmsDeliveryService,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
        NotificationSmsQueue,
        {
            provide: EnumNotificationQueue.notification,
            useExisting: NotificationQueue,
        },
        {
            provide: EnumNotificationQueue.notificationEmail,
            useExisting: NotificationEmailQueue,
        },
        {
            provide: EnumNotificationQueue.notificationPush,
            useExisting: NotificationPushQueue,
        },
        {
            provide: EnumNotificationQueue.notificationSms,
            useExisting: NotificationSmsQueue,
        },
        NotificationUtil,
    ],
    exports: [
        NotificationService,
        NotificationTemplateService,
        NotificationEmailDeliveryService,
        NotificationPushDeliveryService,
        NotificationSmsDeliveryService,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
        NotificationSmsQueue,
        NotificationUtil,
    ],
    imports: [
        ActivityLogModule,
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
            },
            {
                name: EnumNotificationQueue.notificationSms,
                useClass: NotificationSmsQueueFactory,
            }
        ),
    ],
})
export class NotificationModule {}
