import { DeviceModule } from '@modules/device/device.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { NotificationGetListCursorUseCase } from '@modules/notification/use-cases/notification.get-list-cursor.use-case';
import { NotificationGetListUserSettingUseCase } from '@modules/notification/use-cases/notification.get-list-user-setting.use-case';
import { NotificationMarkAsReadUseCase } from '@modules/notification/use-cases/notification.mark-as-read.use-case';
import { NotificationMarkAllAsReadUseCase } from '@modules/notification/use-cases/notification.mark-all-as-read.use-case';
import { NotificationUpdateUserSettingUseCase } from '@modules/notification/use-cases/notification.update-user-setting.use-case';
import { NotificationEmailProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.email.process-publish-term-policy.use-case';
import { NotificationProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.process-publish-term-policy.use-case';
import { NotificationPushProcessCleanupTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-tokens.use-case';
import { NotificationPushProcessCleanupStaleTokensUseCase } from '@modules/notification/use-cases/notification.push.process-cleanup-stale-tokens.use-case';
import { UserModule } from '@modules/user/user.module';
import { NotificationProcessUseCase } from '@modules/notification/use-cases/notification.process.use-case';
import { NotificationEmailProcessSendUseCase } from '@modules/notification/use-cases/notification.email.process-send.use-case';
import { NotificationEmailProcessSendUnregisteredUseCase } from '@modules/notification/use-cases/notification.email.process-send-unregistered.use-case';
import { NotificationPushProcessSendUseCase } from '@modules/notification/use-cases/notification.push.process-send.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationGetListCursorUseCase,
        NotificationGetListUserSettingUseCase,
        NotificationMarkAsReadUseCase,
        NotificationMarkAllAsReadUseCase,
        NotificationUpdateUserSettingUseCase,
        NotificationEmailProcessPublishTermPolicyUseCase,
        NotificationProcessPublishTermPolicyUseCase,
        NotificationPushProcessCleanupTokensUseCase,
        NotificationPushProcessCleanupStaleTokensUseCase,
        NotificationProcessUseCase,
        NotificationEmailProcessSendUseCase,
        NotificationEmailProcessSendUnregisteredUseCase,
        NotificationPushProcessSendUseCase,
    ],
    exports: [
        NotificationGetListCursorUseCase,
        NotificationGetListUserSettingUseCase,
        NotificationMarkAsReadUseCase,
        NotificationMarkAllAsReadUseCase,
        NotificationUpdateUserSettingUseCase,
        NotificationEmailProcessPublishTermPolicyUseCase,
        NotificationProcessPublishTermPolicyUseCase,
        NotificationPushProcessCleanupTokensUseCase,
        NotificationPushProcessCleanupStaleTokensUseCase,
        NotificationProcessUseCase,
        NotificationEmailProcessSendUseCase,
        NotificationEmailProcessSendUnregisteredUseCase,
        NotificationPushProcessSendUseCase,
    ],
    imports: [DeviceModule, UserModule, NotificationModule],
})
export class NotificationUseCaseModule {}
