import { Global, Module } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { TenantPermissionGuard } from '@modules/tenant/guards/tenant.permission.guard';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';

@Global()
@Module({
    providers: [
        TenantService,
        TenantRepository,
        TenantGuard,
        TenantMemberGuard,
        TenantRoleGuard,
        TenantPermissionGuard,
    ],
    exports: [TenantService, TenantRepository],
    imports: [UserModule, RoleModule],
    controllers: [],
})
export class TenantModule {}
