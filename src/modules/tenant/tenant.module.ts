import { Global, Module } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { TenantPermissionGuard } from '@modules/tenant/guards/tenant.permission.guard';
import { TenantAuthService } from '@modules/tenant/services/tenant-auth.service';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthModule } from '@modules/auth/auth.module';

@Global()
@Module({
    providers: [
        TenantService,
        TenantMemberService,
        TenantRepository,
        TenantAuthService,
        TenantGuard,
        TenantMemberGuard,
        TenantRoleGuard,
        TenantPermissionGuard,
    ],
    exports: [TenantService, TenantMemberService,TenantAuthService, TenantRepository],
    imports: [UserModule, RoleModule, AuthModule],
    controllers: [],
})
export class TenantModule {}
