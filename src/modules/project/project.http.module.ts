import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { ProjectMemberHttpService } from '@modules/project/services/http/project.member.http.service';
import { ProjectHttpService } from '@modules/project/services/http/project.http.service';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ProjectHttpService, ProjectMemberHttpService],
    exports: [ProjectHttpService, ProjectMemberHttpService],
    imports: [ProjectDomainModule, WorkspaceDomainModule],
})
export class ProjectHttpModule {}
