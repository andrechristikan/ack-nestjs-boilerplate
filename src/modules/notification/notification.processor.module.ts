import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { NotificationModule } from '@modules/notification/notification.module';
import { NotificationUtilModule } from '@modules/notification/notification.util.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationProcessorService,
        NotificationEmailProcessorService,
        NotificationPushProcessorService,
    ],
    exports: [],
    imports: [NotificationModule, NotificationUtilModule],
})
export class NotificationProcessorModule {}
