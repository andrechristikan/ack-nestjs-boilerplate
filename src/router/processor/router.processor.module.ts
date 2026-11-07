import { ActivityLogUseCaseModule } from '@modules/activity-log/activity-log.use-case.module';
import { NotificationUseCaseModule } from '@modules/notification/notification.use-case.module';
import { SessionUseCaseModule } from '@modules/session/session.use-case.module';
import { TermPolicyUseCaseModule } from '@modules/term-policy/term-policy.use-case.module';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [],
    exports: [],
    imports: [
        ActivityLogUseCaseModule,
        NotificationUseCaseModule,
        SessionUseCaseModule,
        TermPolicyUseCaseModule,
        UserUseCaseModule,
        WorkspaceUseCaseModule,
    ],
})
export class RouterProcessorModule {}
