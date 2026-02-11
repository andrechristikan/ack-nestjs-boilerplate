import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [
        NotificationService,
        NotificationProcessorService,
        NotificationRepository,
        NotificationUtil,
    ],
    providers: [
        NotificationService,
        NotificationProcessorService,
        NotificationRepository,
        NotificationUtil,
    ],
    controllers: [],
})
export class NotificationModule {}

// TODO: NEXT
// - complete logic in notification processor service
// - which part of notification that needs to be registered to firebase
// - which part of notification that need to be revoked
// - test notification is working end to end
// - implement log out api
// - update and complete docs
// - ignore delivery status and outbox event design pattern for now
