import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ActivityLogAdminController } from '@modules/activity-log/controllers/activity-log.admin.controller';
import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { FeatureFlagAdminController } from '@modules/feature-flag/controllers/feature-flag.admin.controller';
import { PasswordHistoryAdminController } from '@modules/password-history/controllers/password-history.admin.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { SessionAdminController } from '@modules/session/controllers/session.admin.controller';
import { SessionModule } from '@modules/session/session.module';
import { TermPolicyAdminController } from '@modules/term-policy/controllers/term-policy.admin.controller';
import { UserAdminController } from '@modules/user/controllers/user.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

/**
 * Admin routes module that provides administrative endpoints.
 * Contains controllers for managing API keys, roles, users, password history, activity logs, sessions, term policies, and feature flags.
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
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        PasswordHistoryModule,
        ActivityLogModule,
        SessionModule,
    ],
})
export class RoutesAdminModule {}
