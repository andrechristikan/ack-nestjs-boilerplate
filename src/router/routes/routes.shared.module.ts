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
import { ProjectModule } from '@modules/project/project.module';
import { ProjectSharedController } from '@modules/project/controllers/project.shared.controller';
import { withTenancyRoute } from '@modules/tenant/utils/tenant.toggle';
import { TenantRoutesSharedModule } from '@modules/tenant/tenant.routes.shared.module';

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
        ProjectSharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        PasswordHistoryModule,
        ActivityLogModule,
        SessionModule,
        ProjectModule,
        ...withTenancyRoute('/shared', TenantRoutesSharedModule),
    ],
})
export class RoutesSharedModule {}
