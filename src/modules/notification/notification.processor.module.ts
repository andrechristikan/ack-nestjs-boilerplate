import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationSmsProcessor } from '@modules/notification/processors/notification.sms.processor';
import { NotificationEmailProcessorService } from '@modules/notification/services/notification.email.processor.service';
import { NotificationProcessorService } from '@modules/notification/services/notification.processor.service';
import { NotificationPushProcessorService } from '@modules/notification/services/notification.push.processor.service';
import { NotificationSmsProcessorService } from '@modules/notification/services/notification.sms.processor.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationSmsProcessor,
        NotificationProcessorService,
        NotificationEmailProcessorService,
        NotificationPushProcessorService,
        NotificationSmsProcessorService,
    ],
    exports: [],
    imports: [],
})
export class NotificationProcessorModule {}
