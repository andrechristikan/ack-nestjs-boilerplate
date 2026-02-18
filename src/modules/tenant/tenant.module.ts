import { Global, Module } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { TenantPermissionGuard } from '@modules/tenant/guards/tenant.permission.guard';
import { TenantAuthService } from '@modules/tenant/services/tenant-auth.service';
import { InvitationModule } from '@modules/invitation/invitation.module';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthModule } from '@modules/auth/auth.module';
import { TenantInvitationProvider } from '@modules/tenant/services/tenant-invitation.provider';

@Global()
@Module({
    providers: [
        TenantService,
        TenantMemberService,
        TenantRepository,
        TenantInvitationProvider,
        TenantAuthService,
        TenantGuard,
        TenantMemberGuard,
        TenantRoleGuard,
        TenantPermissionGuard,
    ],
    exports: [TenantService, TenantMemberService, TenantAuthService, TenantRepository],
    imports: [UserModule, RoleModule, AuthModule, InvitationModule],
    controllers: [],
})
export class TenantModule {}
