import { AnalyticUseCaseModule } from '@modules/analytic/analytic.use-case.module';
import { AnalyticProcessor } from '@modules/analytic/processors/analytic.processor';
import { CacheProcessor } from '@common/cache/processors/cache.processor';
import { ActivityLogUseCaseModule } from '@modules/activity-log/activity-log.use-case.module';
import { ActivityLogProcessor } from '@modules/activity-log/processors/activity-log.processor';
import { OutboxProcessor } from '@common/outbox/processors/outbox.processor';
import { MfaProcessor } from '@modules/mfa/processors/mfa.processor';
import { MfaUseCaseModule } from '@modules/mfa/mfa.use-case.module';
import { NotificationUseCaseModule } from '@modules/notification/notification.use-case.module';
import { PasswordHistoryProcessor } from '@modules/password-history/processors/password-history.processor';
import { PasswordHistoryUseCaseModule } from '@modules/password-history/password-history.use-case.module';
import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationSmsProcessor } from '@modules/notification/processors/notification.sms.processor';
import { SessionProcessor } from '@modules/session/processors/session.processor';
import { SessionUseCaseModule } from '@modules/session/session.use-case.module';
import { TermPolicyProcessor } from '@modules/term-policy/processors/term-policy.processor';
import { TermPolicyUseCaseModule } from '@modules/term-policy/term-policy.use-case.module';
import { UserAuthProcessor } from '@modules/user/processors/user.auth.processor';
import { UserProcessor } from '@modules/user/processors/user.processor';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ActivityLogProcessor,
        AnalyticProcessor,
        CacheProcessor,
        MfaProcessor,
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationSmsProcessor,
        OutboxProcessor,
        PasswordHistoryProcessor,
        SessionProcessor,
        TermPolicyProcessor,
        UserProcessor,
        UserAuthProcessor,
        WorkspaceProcessor,
    ],
    exports: [],
    imports: [
        ActivityLogUseCaseModule,
        AnalyticUseCaseModule,
        MfaUseCaseModule,
        NotificationUseCaseModule,
        PasswordHistoryUseCaseModule,
        SessionUseCaseModule,
        TermPolicyUseCaseModule,
        UserUseCaseModule,
        WorkspaceUseCaseModule,
    ],
})
export class RouterProcessorModule {}
