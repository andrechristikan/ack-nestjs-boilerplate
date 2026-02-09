import { Global, Module } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { TenantPermissionGuard } from '@modules/tenant/guards/tenant.permission.guard';
import { TenantAuthService } from '@modules/tenant/services/tenant-auth.service';
import { TenantPublicController } from '@modules/tenant/controllers/tenant.public.controller';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthModule } from '@modules/auth/auth.module';

@Global()
@Module({
    providers: [
        TenantService,
        TenantRepository,
        TenantAuthService,
        TenantGuard,
        TenantMemberGuard,
        TenantRoleGuard,
        TenantPermissionGuard,
    ],
    exports: [TenantService, TenantRepository],
    imports: [UserModule, RoleModule, AuthModule],
    controllers: [TenantPublicController],
})
export class TenantModule {}
