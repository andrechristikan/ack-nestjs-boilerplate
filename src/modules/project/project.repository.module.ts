import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { Module } from '@nestjs/common';
import { ProjectAnalyticRepository } from '@modules/project/repositories/project.analytic.repository';
import { ProjectMemberAnalyticRepository } from '@modules/project/repositories/project.member.analytic.repository';

@Module({
    controllers: [],
    providers: [
        ProjectRepository,
        ProjectMemberRepository,
        ProjectAnalyticRepository,
        ProjectMemberAnalyticRepository,
    ],
    exports: [
        ProjectRepository,
        ProjectMemberRepository,
        ProjectAnalyticRepository,
        ProjectMemberAnalyticRepository,
    ],
    imports: [],
})
export class ProjectRepositoryModule {}
