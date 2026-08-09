import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

/**
 * Wires the notification and workspace queue processors as providers.
 */
@Module({
    imports: [WorkspaceModule],
    providers: [
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationProcessor,
        WorkspaceProcessor,
    ],
})
export class QueueModule {}
