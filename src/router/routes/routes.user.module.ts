import { TenantUserController } from '@modules/tenant/controllers/tenant.user.controller';
import { TenantModule } from '@modules/tenant/tenant.module';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { ProjectUserController } from '@modules/project/controllers/project.user.controller';
import { ProjectModule } from '@modules/project/project.module';

/**
 * User routes module that provides user-specific endpoints.
 * Contains controllers for user operations that require user-level authentication and authorization.
 */
@Module({
    controllers: [UserUserController, TenantUserController, ProjectUserController],
    providers: [],
    exports: [],
    imports: [UserModule, TenantModule,ProjectModule],
})
export class RoutesUserModule {}
