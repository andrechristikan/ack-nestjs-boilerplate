import { ProjectModule } from '@modules/project/project.module';
import { ProjectUtilModule } from '@modules/project/project.util.module';
import { ProjectMemberHttpService } from '@modules/project/services/project.member.http.service';
import { ProjectHttpService } from '@modules/project/services/project.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ProjectHttpService, ProjectMemberHttpService],
    exports: [ProjectHttpService, ProjectMemberHttpService, ProjectModule],
    imports: [ProjectModule, ProjectUtilModule],
})
export class ProjectHttpModule {}
