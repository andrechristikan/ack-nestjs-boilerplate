import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ProjectRepository, ProjectMemberRepository],
    exports: [ProjectRepository, ProjectMemberRepository],
    imports: [],
})
export class ProjectRepositoryModule {}
