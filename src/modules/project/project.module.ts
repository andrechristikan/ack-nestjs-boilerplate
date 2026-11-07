import { ProjectAnalyticRepository } from '@modules/project/repositories/project.analytic.repository';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectAnalyticService } from '@modules/project/services/project.analytic.service';
import { ProjectMemberAnalyticService } from '@modules/project/services/project.member.analytic.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ProjectRepository,
        ProjectMemberRepository,
        ProjectAnalyticRepository,
        ProjectMemberAnalyticRepository,
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectAnalyticService,
        ProjectMemberAnalyticService,
    ],
    exports: [
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectAnalyticService,
        ProjectMemberAnalyticService,
    ],
    imports: [],
})
export class ProjectModule {}
