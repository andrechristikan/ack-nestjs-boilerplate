import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [NotificationUtil, NotificationService],
    providers: [NotificationUtil, NotificationService],
    controllers: [],
})
export class NotificationModule {}
