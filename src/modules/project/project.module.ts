import { Module } from '@nestjs/common';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPermissionGuard } from '@modules/project/guards/project.permission.guard';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { InvitationModule } from '@modules/invitation/invitation.module';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { ProjectInvitationProvider } from '@modules/project/services/project-invitation.provider';

@Module({
    imports: [UserModule, RoleModule, InvitationModule],
    providers: [
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectRepository,
        ProjectInvitationProvider,
        ProjectMemberGuard,
        ProjectPermissionGuard,
    ],
    exports: [ProjectService, ProjectMemberService, ProjectRepository],
    controllers: [],
})
export class ProjectModule {}
