import { ProjectRepositoryModule } from '@modules/project/project.repository.module';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Module } from '@nestjs/common';

/** Project domain services backing `@Project*Protected` guards and the project HTTP layer. */
@Module({
    controllers: [],
    providers: [ProjectDomain, ProjectMemberDomain, ProjectUtil],
    exports: [ProjectDomain, ProjectMemberDomain, ProjectUtil],
    imports: [ProjectRepositoryModule],
})
export class ProjectDomainModule {}
