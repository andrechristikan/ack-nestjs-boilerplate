import { ActivityLogUseCaseModule } from '@modules/activity-log/activity-log.use-case.module';
import { ActivityLogSharedController } from '@modules/activity-log/controllers/activity-log.shared.controller';
import { DeviceSharedController } from '@modules/device/controllers/device.shared.controller';
import { DeviceUseCaseModule } from '@modules/device/device.use-case.module';
import { NotificationSharedController } from '@modules/notification/controllers/notification.shared.controller';
import { NotificationUseCaseModule } from '@modules/notification/notification.use-case.module';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryUseCaseModule } from '@modules/password-history/password-history.use-case.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { SessionUseCaseModule } from '@modules/session/session.use-case.module';
import { TermPolicySharedController } from '@modules/term-policy/controllers/term-policy.shared.controller';
import { TermPolicyUseCaseModule } from '@modules/term-policy/term-policy.use-case.module';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        UserSharedController,
        PasswordHistorySharedController,
        ActivityLogSharedController,
        SessionSharedController,
        TermPolicySharedController,
        DeviceSharedController,
        NotificationSharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        ActivityLogUseCaseModule,
        UserUseCaseModule,
        PasswordHistoryUseCaseModule,
        DeviceUseCaseModule,
        SessionUseCaseModule,
        TermPolicyUseCaseModule,
        NotificationUseCaseModule,
        WorkspaceUseCaseModule,

        UserModule,
        WorkspaceModule,
    ],
})
export class RouterHttpSharedModule {}
