import { ActivityLogAdminController } from '@modules/activity-log/controllers/activity-log.admin.controller';
import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { DeviceAdminController } from '@modules/device/controllers/device.admin.controller';
import { DeviceModule } from '@modules/device/device.module';
import { FeatureFlagAdminController } from '@modules/feature-flag/controllers/feature-flag.admin.controller';
import { PasswordHistoryAdminController } from '@modules/password-history/controllers/password-history.admin.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { SessionAdminController } from '@modules/session/controllers/session.admin.controller';
import { TermPolicyAdminController } from '@modules/term-policy/controllers/term-policy.admin.controller';
import { UserAdminController } from '@modules/user/controllers/user.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { withTenancyRoute } from '@modules/tenant/utils/tenant.toggle';
import { TenantRoutesAdminModule } from '@modules/tenant/tenant.routes.admin.module';
import { SessionModule } from '@modules/session/session.module';

/**
 * Admin routes module providing administrative API endpoints.
 * Includes controllers for managing API keys, roles, users, password history, activity logs,
 * sessions, term policies, feature flags, and devices.
 */
@Module({
    controllers: [
        ApiKeyAdminController,
        RoleAdminController,
        UserAdminController,
        PasswordHistoryAdminController,
        ActivityLogAdminController,
        SessionAdminController,
        TermPolicyAdminController,
        FeatureFlagAdminController,
        DeviceAdminController,
    ],
    providers: [],
    exports: [],
    imports: [UserModule, PasswordHistoryModule, DeviceModule, SessionModule,
        ...withTenancyRoute('/admin', TenantRoutesAdminModule)],
})
export class RoutesAdminModule {}
