import { EmailModule } from '@modules/email/email.module';
import { EmailProcessor } from '@modules/email/processors/email.processor';
import { NotificationModule } from '@modules/notification/notification.module';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { Module } from '@nestjs/common';

/**
 * Module for managing queue processors.
 * Imports queue-related modules and provides processors for background jobs.
 */
@Module({
    imports: [EmailModule, NotificationModule],
    providers: [EmailProcessor, NotificationProcessor],
})
export class QueueModule {}
