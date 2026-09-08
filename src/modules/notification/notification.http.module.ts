import { NotificationHttpService } from '@modules/notification/services/notification.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [NotificationHttpService],
    exports: [NotificationHttpService],
    imports: [],
})
export class NotificationHttpModule {}
