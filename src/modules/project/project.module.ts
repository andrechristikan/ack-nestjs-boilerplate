import { ProjectRepositoryModule } from '@modules/project/project.repository.module';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

/** Project domain services backing `@Project*Protected` guards and the project HTTP layer. */
@Module({
    controllers: [],
    providers: [ProjectService, ProjectMemberService, ProjectUtil],
    exports: [ProjectService, ProjectMemberService, ProjectUtil],
    imports: [ProjectRepositoryModule, WorkspaceModule],
})
export class ProjectModule {}
