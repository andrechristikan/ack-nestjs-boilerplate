import { NotificationHttpService } from '@modules/notification/services/notification.http.service';
import { NotificationModule } from '@modules/notification/notification.module';
import { NotificationUtilModule } from '@modules/notification/notification.util.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [NotificationHttpService],
    exports: [NotificationHttpService],
    imports: [NotificationModule, NotificationUtilModule],
})
export class NotificationHttpModule {}
