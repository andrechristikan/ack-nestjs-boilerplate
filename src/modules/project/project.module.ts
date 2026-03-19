import { Module } from '@nestjs/common';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectInviteRepository } from '@modules/project/repositories/project-invite.repository';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPermissionGuard } from '@modules/project/guards/project.permission.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { TenantModule } from '@modules/tenant/tenant.module';

@Module({
    imports: [UserModule, RoleModule, TenantModule],
    providers: [
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectRepository,
        ProjectInviteRepository,
        ProjectMemberGuard,
        ProjectPermissionGuard,
        ProjectRoleGuard,
    ],
    exports: [
        ProjectService,
        ProjectMemberService,
        ProjectRepository,
        ProjectInviteRepository,
    ],
    controllers: [],
})
export class ProjectModule {}
