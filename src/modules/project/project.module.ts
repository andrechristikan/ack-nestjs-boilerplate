import { Module } from '@nestjs/common';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPermissionGuard } from '@modules/project/guards/project.permission.guard';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { InviteModule } from '@modules/invite/invite.module';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { ProjectInviteProvider } from '@modules/project/services/project-invite.provider';

@Module({
    imports: [UserModule, RoleModule, InviteModule],
    providers: [
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectRepository,
        ProjectInviteProvider,
        ProjectMemberGuard,
        ProjectPermissionGuard,
    ],
    exports: [ProjectService, ProjectMemberService, ProjectRepository],
    controllers: [],
})
export class ProjectModule {}
