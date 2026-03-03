import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { Module } from '@nestjs/common';

/**
 * Module for managing queue processors.
 * Imports queue-related modules and provides processors for background jobs.
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
