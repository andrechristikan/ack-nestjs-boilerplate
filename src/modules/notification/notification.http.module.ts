import { NotificationHttpService } from '@modules/notification/services/http/notification.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [NotificationHttpService],
    exports: [NotificationHttpService],
    imports: [],
})
export class NotificationHttpModule {}
