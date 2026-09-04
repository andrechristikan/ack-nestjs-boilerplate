import { ProjectRepositoryModule } from '@modules/project/project.repository.module';
import { ProjectUtilModule } from '@modules/project/project.util.module';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

/** Project domain services backing `@Project*Protected` guards and the project HTTP layer. */
@Module({
    controllers: [],
    providers: [ProjectService, ProjectMemberService],
    exports: [ProjectService, ProjectMemberService],
    imports: [ProjectRepositoryModule, ProjectUtilModule, WorkspaceModule],
})
export class ProjectModule {}
