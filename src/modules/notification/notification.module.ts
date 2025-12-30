import { Module } from '@nestjs/common';
import { EmailModule } from '@modules/email/email.module';
import { NotificationDeliveryRepository } from '@modules/notification/repositories/notification-delivery.repository';
import { NotificationOutboxRepository } from '@modules/notification/repositories/notification-outbox.repository';
import { NotificationPushTokenRepository } from '@modules/notification/repositories/notification-push-token.repository';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationSettingRepository } from '@modules/notification/repositories/notification-setting.repository';
import { NotificationTemplateRepository } from '@modules/notification/repositories/notification-template.repository';
import { NotificationOutboxService } from '@modules/notification/services/notification-outbox.service';
import { NotificationPushService } from '@modules/notification/services/notification.push.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationTemplateService } from '@modules/notification/services/notification-template.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

@Module({
    imports: [EmailModule],
    exports: [
        NotificationService,
        NotificationUtil,
        NotificationRepository,
        NotificationOutboxService,
        NotificationOutboxRepository,
        NotificationSettingRepository,
        NotificationPushTokenRepository,
        NotificationPushService,
        NotificationDeliveryRepository,
        NotificationTemplateRepository,
        NotificationTemplateService,
    ],
    providers: [
        NotificationService,
        NotificationUtil,
        NotificationRepository,
        NotificationOutboxService,
        NotificationOutboxRepository,
        NotificationSettingRepository,
        NotificationPushTokenRepository,
        NotificationPushService,
        NotificationDeliveryRepository,
        NotificationTemplateRepository,
        NotificationTemplateService,
    ],
    controllers: [],
})
export class NotificationModule {}

