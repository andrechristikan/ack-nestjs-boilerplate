import { NotificationSharedModule } from '@modules/notification/notification.shared.module';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { UserSharedModule } from '@modules/user/user.shared.module';
import { Module } from '@nestjs/common';

@Module({
    imports: [NotificationSharedModule, UserSharedModule],
    exports: [NotificationService, NotificationProcessorService],
    providers: [NotificationService, NotificationProcessorService],
    controllers: [],
})
export class NotificationModule {}

// TODO: NEXT
// - move all interceptor logic to the service layer, centralize
// - complete controller share
// - complete controller admin
// - complete logic in notification processor service
// - which part of notification that needs to be registered to firebase
// - which part of notification that need to be revoked
// - test notification is working end to end
// - implement log out api
// - update and complete docs
// - ignore outbox event design pattern for now
