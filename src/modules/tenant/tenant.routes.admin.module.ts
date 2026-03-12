import { Module } from '@nestjs/common';
import { TenantModule } from '@modules/tenant/tenant.module';
import { TenantAdminController } from '@modules/tenant/controllers/tenant.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { ActivityLogModule } from '@modules/activity-log/activity-log.module';

@Module({
    imports: [UserModule, ActivityLogModule, TenantModule],
    controllers: [TenantAdminController],
})
export class TenantRoutesAdminModule {}
