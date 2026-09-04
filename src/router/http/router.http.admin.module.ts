import { ActivityLogHttpModule } from '@modules/activity-log/activity-log.http.module';
import { ActivityLogAdminController } from '@modules/activity-log/controllers/activity-log.admin.controller';
import { ApiKeyHttpModule } from '@modules/api-key/api-key.http.module';
import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { DeviceAdminController } from '@modules/device/controllers/device.admin.controller';
import { DeviceHttpModule } from '@modules/device/device.http.module';
import { FeatureFlagAdminController } from '@modules/feature-flag/controllers/feature-flag.admin.controller';
import { FeatureFlagHttpModule } from '@modules/feature-flag/feature-flag.http.module';
import { PasswordHistoryAdminController } from '@modules/password-history/controllers/password-history.admin.controller';
import { PasswordHistoryHttpModule } from '@modules/password-history/password-history.http.module';
import { ProjectAdminController } from '@modules/project/controllers/project.admin.controller';
import { ProjectModule } from '@modules/project/project.module';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { RoleHttpModule } from '@modules/role/role.http.module';
import { SessionAdminController } from '@modules/session/controllers/session.admin.controller';
import { SessionHttpModule } from '@modules/session/session.http.module';
import { TermPolicyAdminController } from '@modules/term-policy/controllers/term-policy.admin.controller';
import { TermPolicyHttpModule } from '@modules/term-policy/term-policy.http.module';
import { UserAdminController } from '@modules/user/controllers/user.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceAdminController } from '@modules/workspace/controllers/workspace.admin.controller';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

/**
 * Mounts administrative controllers: API key, role, user, password history,
 * activity log, session, term policy, feature flag, device, workspace, and
 * project (read-only).
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
        WorkspaceAdminController,
        ProjectAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        ActivityLogHttpModule,
        ApiKeyHttpModule,
        UserModule,
        PasswordHistoryHttpModule,
        DeviceHttpModule,
        FeatureFlagHttpModule,
        RoleHttpModule,
        SessionHttpModule,
        TermPolicyHttpModule,
        WorkspaceModule,
        ProjectModule,
    ],
})
export class RouterHttpAdminModule {}
