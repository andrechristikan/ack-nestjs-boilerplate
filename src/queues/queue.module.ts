import { NotificationProcessorModule } from '@modules/notification/notification.processor.module';
import { WorkspaceProcessorModule } from '@modules/workspace/workspace.processor.module';
import { Module } from '@nestjs/common';

/**
 * Wires the notification and workspace queue processors as providers.
 */
@Module({
    imports: [NotificationProcessorModule, WorkspaceProcessorModule],
    providers: [],
})
export class QueueModule {}
