import { AwsModule } from '@common/aws/aws.module';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { NotificationRepositoryModule } from '@modules/notification/notification.repository.module';
import { NotificationEmailQueueFactory } from '@modules/notification/factories/notification.email.queue.factory';
import { NotificationPushQueueFactory } from '@modules/notification/factories/notification.push.queue.factory';
import { NotificationQueueFactory } from '@modules/notification/factories/notification.queue.factory';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import { NotificationEmailAccountDomain } from '@modules/notification/domains/notification.email.account.domain';
import { NotificationEmailSecurityDomain } from '@modules/notification/domains/notification.email.security.domain';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { NotificationEmailWorkspaceDomain } from '@modules/notification/domains/notification.email.workspace.domain';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { NotificationTemplateAccountDomain } from '@modules/notification/domains/notification.template.account.domain';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';
import { NotificationTemplateTermPolicyDomain } from '@modules/notification/domains/notification.template.term-policy.domain';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QueueConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';

@Global()
@Module({
    controllers: [],
    providers: [
        NotificationDomain,
        NotificationTemplateAccountDomain,
        NotificationTemplateSecurityDomain,
        NotificationTemplateTermPolicyDomain,
        NotificationTemplateWorkspaceDomain,
        NotificationAccountDomain,
        NotificationSecurityDomain,
        NotificationTermPolicyDomain,
        NotificationWorkspaceDomain,
        NotificationEmailAccountDomain,
        NotificationEmailSecurityDomain,
        NotificationEmailTermPolicyDomain,
        NotificationEmailWorkspaceDomain,
        NotificationPushSecurityDomain,
        NotificationPushWorkspaceDomain,
        NotificationPushMaintenanceDomain,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
    ],
    exports: [
        BullModule,
        NotificationDomain,
        NotificationTemplateAccountDomain,
        NotificationTemplateSecurityDomain,
        NotificationTemplateTermPolicyDomain,
        NotificationTemplateWorkspaceDomain,
        NotificationAccountDomain,
        NotificationSecurityDomain,
        NotificationTermPolicyDomain,
        NotificationWorkspaceDomain,
        NotificationEmailAccountDomain,
        NotificationEmailSecurityDomain,
        NotificationEmailTermPolicyDomain,
        NotificationEmailWorkspaceDomain,
        NotificationPushSecurityDomain,
        NotificationPushWorkspaceDomain,
        NotificationPushMaintenanceDomain,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
    ],
    imports: [
        BullModule.registerQueueAsync(
            {
                name: EnumQueue.notificationEmail,
                configKey: QueueConfigKey,
                useClass: NotificationEmailQueueFactory,
            },
            {
                name: EnumQueue.notificationPush,
                configKey: QueueConfigKey,
                useClass: NotificationPushQueueFactory,
            },
            {
                name: EnumQueue.notification,
                configKey: QueueConfigKey,
                useClass: NotificationQueueFactory,
            }
        ),
        NotificationRepositoryModule,
        UserDomainModule,
        DeviceDomainModule,
        AwsModule,
    ],
})
export class NotificationDomainModule {}
