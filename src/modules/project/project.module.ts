import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ProjectRepository,
        ProjectMemberRepository,
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
    ],
    exports: [ProjectService, ProjectMemberService, ProjectUtil],
    imports: [ActivityLogModule],
})
export class ProjectModule {}
