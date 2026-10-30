import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { WorkspaceJoinRequestHttpService } from '@modules/workspace/services/workspace.join-request.http.service';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        WorkspaceHttpService,
        WorkspaceMemberHttpService,
        WorkspaceInviteHttpService,
        WorkspaceJoinRequestHttpService,
    ],
    exports: [
        WorkspaceHttpService,
        WorkspaceMemberHttpService,
        WorkspaceInviteHttpService,
        WorkspaceJoinRequestHttpService,
    ],
    imports: [
        DeviceDomainModule,
        ProjectDomainModule,
        UserDomainModule,
        WorkspaceDomainModule,
    ],
})
export class WorkspaceHttpModule {}
