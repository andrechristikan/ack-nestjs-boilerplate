import { Global, Module } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantInviteService } from '@modules/tenant/services/tenant-invite.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantInviteRepository } from '@modules/tenant/repositories/tenant-invite.repository';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthModule } from '@modules/auth/auth.module';

@Global()
@Module({
    providers: [
        TenantService,
        TenantMemberService,
        TenantInviteService,
        TenantRepository,
        TenantInviteRepository,
        TenantUtil,
        TenantGuard,
        TenantMemberGuard,
        TenantRoleGuard,
    ],
    exports: [
        TenantService,
        TenantMemberService,
        TenantInviteService,
        TenantRepository,
        TenantUtil,
    ],
    imports: [
        UserModule,
        RoleModule,
        AuthModule,
    ],
    controllers: [],
})
export class TenantModule {}
