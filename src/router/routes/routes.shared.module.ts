import { ActivityLogSharedController } from '@modules/activity-log/controllers/activity-log.shared.controller';
import { DeviceSharedController } from '@modules/device/controllers/device.shared.controller';
import { DeviceModule } from '@modules/device/device.module';
import { NotificationSharedController } from '@modules/notification/controllers/notification.shared.controller';
import { NotificationModule } from '@modules/notification/notification.module';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { TermPolicySharedController } from '@modules/term-policy/controllers/term-policy.shared.controller';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

/**
 * Shared routes module that provides endpoints accessible by multiple user types.
 * Contains controllers for users, password history, activity logs, sessions, and term policies that are shared between different access levels.
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
        UserModule,
        PasswordHistoryModule,
        DeviceModule,
        NotificationModule,
    ],
})
export class RoutesSharedModule {}
