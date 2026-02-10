import { Module } from '@nestjs/common';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { TenantModule } from '@modules/tenant/tenant.module';

@Module({
    imports: [UserModule, RoleModule, TenantModule],
    providers: [
        ProjectService,
        ProjectRepository,
        ProjectMemberGuard,
    ],
    exports: [ProjectService, ProjectRepository],
    controllers: [],
})
export class ProjectModule {}
