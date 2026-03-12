import { Module } from '@nestjs/common';
import { TenantModule } from '@modules/tenant/tenant.module';
import { ProjectModule } from '@modules/project/project.module';
import { TenantSharedController } from '@modules/tenant/controllers/tenant.shared.controller';
import { ProjectTenantSharedController } from '@modules/project/controllers/project-tenant.shared.controller';
import { UserModule } from '@modules/user/user.module';

@Module({
    imports: [UserModule, TenantModule, ProjectModule],
    controllers: [TenantSharedController, ProjectTenantSharedController],
})
export class TenantRoutesSharedModule {}
