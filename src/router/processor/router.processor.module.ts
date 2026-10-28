import { ActivityLogProcessorModule } from '@modules/activity-log/activity-log.processor.module';
import { NotificationProcessorModule } from '@modules/notification/notification.processor.module';
import { SessionProcessorModule } from '@modules/session/session.processor.module';
import { TermPolicyProcessorModule } from '@modules/term-policy/term-policy.processor.module';
import { UserProcessorModule } from '@modules/user/user.processor.module';
import { WorkspaceProcessorModule } from '@modules/workspace/workspace.processor.module';
import { Module } from '@nestjs/common';

/**
 * Root processor mount that aggregates every feature processor module.
 */
@Module({
    controllers: [],
    providers: [],
    exports: [],
    imports: [
        ActivityLogProcessorModule,
        NotificationProcessorModule,
        SessionProcessorModule,
        TermPolicyProcessorModule,
        UserProcessorModule,
        WorkspaceProcessorModule,
    ],
})
export class RouterProcessorModule {}
