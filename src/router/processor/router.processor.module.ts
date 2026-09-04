import { NotificationProcessorModule } from '@modules/notification/notification.processor.module';
import { WorkspaceProcessorModule } from '@modules/workspace/workspace.processor.module';
import { Module } from '@nestjs/common';

/**
 * Root processor mount that aggregates every feature processor module.
 */
@Module({
    imports: [NotificationProcessorModule, WorkspaceProcessorModule],
})
export class RouterProcessorModule {}
