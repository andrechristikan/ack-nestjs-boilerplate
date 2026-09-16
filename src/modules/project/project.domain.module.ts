import { ProjectRepositoryModule } from '@modules/project/project.repository.module';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Module } from '@nestjs/common';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { ProjectMemberAnalyticDomain } from '@modules/project/domains/project.member.analytic.domain';

/** Project domain services backing `@Project*Protected` guards and the project HTTP layer. */
@Module({
    controllers: [],
    providers: [
        ProjectDomain,
        ProjectMemberDomain,
        ProjectUtil,
        ProjectAnalyticDomain,
        ProjectMemberAnalyticDomain,
    ],
    exports: [
        ProjectDomain,
        ProjectMemberDomain,
        ProjectUtil,
        ProjectAnalyticDomain,
        ProjectMemberAnalyticDomain,
    ],
    imports: [ProjectRepositoryModule],
})
export class ProjectDomainModule {}
