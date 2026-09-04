import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { WorkspaceProcessorModule } from '@modules/workspace/workspace.processor.module';
import { Module } from '@nestjs/common';

/**
 * Wires the notification and workspace queue processors as providers.
 */
@Module({
    imports: [WorkspaceProcessorModule],
    providers: [
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationProcessor,
    ],
})
export class QueueModule {}
