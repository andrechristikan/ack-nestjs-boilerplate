import { AwsModule } from '@common/aws/aws.module';
import { DeviceModule } from '@modules/device/device.module';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueueFactory } from '@modules/notification/factories/notification.email.queue.factory';
import { NotificationPushQueueFactory } from '@modules/notification/factories/notification.push.queue.factory';
import { NotificationQueueFactory } from '@modules/notification/factories/notification.queue.factory';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationAccountService } from '@modules/notification/services/notification.account.service';
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { NotificationPushSecurityService } from '@modules/notification/services/notification.push.security.service';
import { NotificationPushWorkspaceService } from '@modules/notification/services/notification.push.workspace.service';
import { NotificationSecurityService } from '@modules/notification/services/notification.security.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationTemplateAccountService } from '@modules/notification/services/notification.template.account.service';
import { NotificationTemplateSecurityService } from '@modules/notification/services/notification.template.security.service';
import { NotificationTemplateTermPolicyService } from '@modules/notification/services/notification.template.term-policy.service';
import { NotificationTemplateWorkspaceService } from '@modules/notification/services/notification.template.workspace.service';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import { NotificationWorkspaceService } from '@modules/notification/services/notification.workspace.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationRepository,
        NotificationUserSettingRepository,
        NotificationService,
        NotificationTemplateAccountService,
        NotificationTemplateSecurityService,
        NotificationTemplateTermPolicyService,
        NotificationTemplateWorkspaceService,
        NotificationAccountService,
        NotificationSecurityService,
        NotificationTermPolicyService,
        NotificationWorkspaceService,
        NotificationEmailAccountService,
        NotificationEmailSecurityService,
        NotificationEmailTermPolicyService,
        NotificationEmailWorkspaceService,
        NotificationPushDeliveryService,
        NotificationPushSecurityService,
        NotificationPushWorkspaceService,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
        NotificationUtil,
    ],
    exports: [
        NotificationService,
        NotificationTemplateAccountService,
        NotificationTemplateSecurityService,
        NotificationTemplateTermPolicyService,
        NotificationTemplateWorkspaceService,
        NotificationAccountService,
        NotificationSecurityService,
        NotificationTermPolicyService,
        NotificationWorkspaceService,
        NotificationEmailAccountService,
        NotificationEmailSecurityService,
        NotificationEmailTermPolicyService,
        NotificationEmailWorkspaceService,
        NotificationPushSecurityService,
        NotificationPushWorkspaceService,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
        NotificationUtil,
    ],
    imports: [
        DeviceModule,
        AwsModule,
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
