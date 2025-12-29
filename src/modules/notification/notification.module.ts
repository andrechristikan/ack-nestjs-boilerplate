import { Module } from '@nestjs/common';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

@Module({
    imports: [],
    exports: [NotificationService, NotificationUtil, NotificationRepository],
    providers: [NotificationService, NotificationUtil, NotificationRepository],
    controllers: [],
})
export class NotificationModule {}
