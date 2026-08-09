import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

/** Project guard/service layer backing `@Project*Protected`; HTTP controllers are wired through the router modules. */
@Module({
    // @note: remove this import and DI breaks — util/repository come from here.
    imports: [WorkspaceModule],
    exports: [ProjectService, ProjectRepository, ProjectMemberRepository],
    providers: [
        ProjectService,
        ProjectRepository,
        ProjectMemberRepository,
        ProjectUtil,
    ],
    controllers: [],
})
export class ProjectModule {}
