import { ActivityLogHttpModule } from '@modules/activity-log/activity-log.http.module';
import { ActivityLogSharedController } from '@modules/activity-log/controllers/activity-log.shared.controller';
import { DeviceSharedController } from '@modules/device/controllers/device.shared.controller';
import { DeviceHttpModule } from '@modules/device/device.http.module';
import { NotificationSharedController } from '@modules/notification/controllers/notification.shared.controller';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryHttpModule } from '@modules/password-history/password-history.http.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { SessionHttpModule } from '@modules/session/session.http.module';
import { TermPolicySharedController } from '@modules/term-policy/controllers/term-policy.shared.controller';
import { TermPolicyHttpModule } from '@modules/term-policy/term-policy.http.module';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceHttpModule } from '@modules/workspace/workspace.http.module';
import { Module } from '@nestjs/common';

/**
 * Mounts controllers shared across access levels: user, password history,
 * activity log, session, term policy, device, and notification.
 */
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
        ActivityLogHttpModule,
        UserModule,
        PasswordHistoryHttpModule,
        DeviceHttpModule,
        SessionHttpModule,
        TermPolicyHttpModule,
        WorkspaceHttpModule,
    ],
})
export class RouterHttpSharedModule {}
