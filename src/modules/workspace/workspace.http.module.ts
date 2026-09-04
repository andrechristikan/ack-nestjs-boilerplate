import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { WorkspaceJoinRequestHttpService } from '@modules/workspace/services/workspace.join-request.http.service';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { WorkspaceUtilModule } from '@modules/workspace/workspace.util.module';
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
        WorkspaceModule,
    ],
    imports: [WorkspaceModule, WorkspaceUtilModule],
})
export class WorkspaceHttpModule {}
