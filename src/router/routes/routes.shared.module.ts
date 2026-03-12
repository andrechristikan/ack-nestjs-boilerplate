import { ActivityLogSharedController } from '@modules/activity-log/controllers/activity-log.shared.controller';
import { DeviceSharedController } from '@modules/device/controllers/device.shared.controller';
import { DeviceModule } from '@modules/device/device.module';
import { NotificationSharedController } from '@modules/notification/controllers/notification.shared.controller';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { TermPolicySharedController } from '@modules/term-policy/controllers/term-policy.shared.controller';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { ProjectModule } from '@modules/project/project.module';
import { ProjectSharedController } from '@modules/project/controllers/project.shared.controller';
import { withTenancyRoute } from '@modules/tenant/utils/tenant.toggle';
import { TenantRoutesSharedModule } from '@modules/tenant/tenant.routes.shared.module';

/**
 * Shared routes module providing endpoints accessible by multiple user types.
 * Includes controllers for user management, notifications, sessions, password history,
 * activity logs, term policies, and device management shared across different access levels.
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
        ProjectSharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        PasswordHistoryModule,
        DeviceModule,
        ProjectModule,
        ...withTenancyRoute('/shared', TenantRoutesSharedModule),
    ],
})
export class RoutesSharedModule {}
