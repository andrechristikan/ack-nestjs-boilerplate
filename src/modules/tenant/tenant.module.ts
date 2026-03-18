import { Global, Module } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { TenantMemberService } from '@modules/tenant/services/tenant-member.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantGuard } from '@modules/tenant/guards/tenant.guard';
import { TenantMemberGuard } from '@modules/tenant/guards/tenant.member.guard';
import { TenantRoleGuard } from '@modules/tenant/guards/tenant.role.guard';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { TenantInviteService } from '@modules/tenant/services/tenant-invite.service';
import { TenantInviteRepository } from '@modules/tenant/repositories/tenant-invite.repository';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { AuthModule } from '@modules/auth/auth.module';

@Global()
@Module({
    providers: [
        TenantService,
        TenantMemberService,
        TenantRepository,
        TenantUtil,
        TenantInviteService,
        TenantInviteRepository,
        TenantGuard,
        TenantMemberGuard,
        TenantRoleGuard,
    ],
    exports: [
        TenantService,
        TenantMemberService,
        TenantRepository,
        TenantUtil,
        TenantInviteService,
        TenantInviteRepository,
    ],
    imports: [
        UserModule,
        RoleModule,
        AuthModule,
    ],
    controllers: [],
})
export class TenantModule {}
