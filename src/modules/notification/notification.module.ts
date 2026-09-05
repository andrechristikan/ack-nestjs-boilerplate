import { AwsModule } from '@common/aws/aws.module';
import { DeviceModule } from '@modules/device/device.module';
import { NotificationRepositoryModule } from '@modules/notification/notification.repository.module';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationAccountService } from '@modules/notification/services/notification.account.service';
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { NotificationPushMaintenanceService } from '@modules/notification/services/notification.push.maintenance.service';
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
import { UserModule } from '@modules/user/user.module';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    controllers: [],
    providers: [
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
        NotificationPushMaintenanceService,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
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
        NotificationPushMaintenanceService,
        NotificationQueue,
        NotificationEmailQueue,
        NotificationPushQueue,
    ],
    imports: [
        NotificationRepositoryModule,
        UserModule,
        DeviceModule,
        AwsModule,
    ],
})
export class NotificationModule {}
