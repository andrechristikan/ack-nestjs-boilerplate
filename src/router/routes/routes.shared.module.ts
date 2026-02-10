import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ActivityLogSharedController } from '@modules/activity-log/controllers/activity-log.shared.controller';
import { PasswordHistorySharedController } from '@modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { SessionModule } from '@modules/session/session.module';
import { TermPolicySharedController } from '@modules/term-policy/controllers/term-policy.shared.controller';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { TenantModule } from '@modules/tenant/tenant.module';
import { TenantSharedController } from '@modules/tenant/controllers/tenant.shared.controller';
import { ProjectModule } from '@modules/project/project.module';
import { ProjectSharedController } from '@modules/project/controllers/project.shared.controller';
import { ProjectTenantSharedController } from '@modules/project/controllers/project.tenant.shared.controller';

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
        TenantSharedController,
        ProjectSharedController,
        ProjectTenantSharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        PasswordHistoryModule,
        ActivityLogModule,
        SessionModule,
        TenantModule,
        ProjectModule,
    ],
})
export class RoutesSharedModule {}
