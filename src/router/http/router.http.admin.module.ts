import { ActivityLogUseCaseModule } from '@modules/activity-log/activity-log.use-case.module';
import { ActivityLogAdminController } from '@modules/activity-log/controllers/activity-log.admin.controller';
import { ApiKeyUseCaseModule } from '@modules/api-key/api-key.use-case.module';
import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { DeviceAdminController } from '@modules/device/controllers/device.admin.controller';
import { DeviceUseCaseModule } from '@modules/device/device.use-case.module';
import { FeatureFlagAdminController } from '@modules/feature-flag/controllers/feature-flag.admin.controller';
import { FeatureFlagUseCaseModule } from '@modules/feature-flag/feature-flag.use-case.module';
import { PasswordHistoryAdminController } from '@modules/password-history/controllers/password-history.admin.controller';
import { PasswordHistoryUseCaseModule } from '@modules/password-history/password-history.use-case.module';
import { PolicyAdminController } from '@modules/policy/controllers/policy.admin.controller';
import { PolicyUseCaseModule } from '@modules/policy/policy.use-case.module';
import { ProjectAdminController } from '@modules/project/controllers/project.admin.controller';
import { ProjectUseCaseModule } from '@modules/project/project.use-case.module';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { RoleUseCaseModule } from '@modules/role/role.use-case.module';
import { SessionAdminController } from '@modules/session/controllers/session.admin.controller';
import { SessionUseCaseModule } from '@modules/session/session.use-case.module';
import { TermPolicyAdminController } from '@modules/term-policy/controllers/term-policy.admin.controller';
import { TermPolicyUseCaseModule } from '@modules/term-policy/term-policy.use-case.module';
import { UserAdminController } from '@modules/user/controllers/user.admin.controller';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspaceAdminController } from '@modules/workspace/controllers/workspace.admin.controller';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { AnalyticUseCaseModule } from '@modules/analytic/analytic.use-case.module';
import { AnalyticAdminController } from '@modules/analytic/controllers/analytic.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

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
        PolicyAdminController,
        AnalyticAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        ActivityLogUseCaseModule,
        ApiKeyUseCaseModule,
        UserUseCaseModule,
        PasswordHistoryUseCaseModule,
        DeviceUseCaseModule,
        FeatureFlagUseCaseModule,
        RoleUseCaseModule,
        SessionUseCaseModule,
        TermPolicyUseCaseModule,
        WorkspaceUseCaseModule,
        ProjectUseCaseModule,
        PolicyUseCaseModule,
        AnalyticUseCaseModule,

        UserModule,
    ],
})
export class RouterHttpAdminModule {}
