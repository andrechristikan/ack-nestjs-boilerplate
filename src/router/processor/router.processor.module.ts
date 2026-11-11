import { ActivityLogUseCaseModule } from '@modules/activity-log/activity-log.use-case.module';
import { ActivityLogProcessor } from '@modules/activity-log/processors/activity-log.processor';
import { OutboxUseCaseModule } from '@modules/outbox/outbox.use-case.module';
import { OutboxProcessor } from '@modules/outbox/processors/outbox.processor';
import { NotificationUseCaseModule } from '@modules/notification/notification.use-case.module';
import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { SessionProcessor } from '@modules/session/processors/session.processor';
import { SessionUseCaseModule } from '@modules/session/session.use-case.module';
import { TermPolicyProcessor } from '@modules/term-policy/processors/term-policy.processor';
import { TermPolicyUseCaseModule } from '@modules/term-policy/term-policy.use-case.module';
import { UserProcessor } from '@modules/user/processors/user.processor';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ActivityLogProcessor,
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
        OutboxProcessor,
        SessionProcessor,
        TermPolicyProcessor,
        UserProcessor,
        WorkspaceProcessor,
    ],
    exports: [],
    imports: [
        ActivityLogUseCaseModule,
        NotificationUseCaseModule,
        OutboxUseCaseModule,
        SessionUseCaseModule,
        TermPolicyUseCaseModule,
        UserUseCaseModule,
        WorkspaceUseCaseModule,
    ],
})
export class RouterProcessorModule {}
