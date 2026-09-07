import { AwsModule } from '@common/aws/aws.module';
import { DeviceRepositoryModule } from '@modules/device/device.repository.module';
import { NotificationRepositoryModule } from '@modules/notification/notification.repository.module';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
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
import { UserRepositoryModule } from '@modules/user/user.repository.module';
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
        NotificationUtil,
        NotificationEmailUtil,
        NotificationPushUtil,
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
        NotificationUtil,
        NotificationEmailUtil,
        NotificationPushUtil,
    ],
    imports: [
        NotificationRepositoryModule,
        UserRepositoryModule,
        UserModule,
        DeviceRepositoryModule,
        AwsModule,
    ],
})
export class NotificationModule {}
