import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { Module } from '@nestjs/common';

/**
 * Wires the notification queue processors as providers.
 */
@Module({
    imports: [],
    providers: [
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationProcessor,
    ],
})
export class QueueModule {}
