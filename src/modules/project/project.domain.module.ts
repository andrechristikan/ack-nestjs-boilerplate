import { ProjectRepositoryModule } from '@modules/project/project.repository.module';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { Module } from '@nestjs/common';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';

/** Project domain services backing `@Project*Protected` guards and the project HTTP layer. */
@Module({
    controllers: [],
    providers: [
        ProjectDomain,
        ProjectMemberDomain,
        ProjectAnalyticDomain,
        ProjectMemberAnalyticDomain,
    ],
    exports: [
        ProjectDomain,
        ProjectMemberDomain,
        ProjectAnalyticDomain,
        ProjectMemberAnalyticDomain,
    ],
    imports: [ProjectRepositoryModule],
})
export class ProjectDomainModule {}
