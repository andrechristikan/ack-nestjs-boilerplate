import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceRepositoryModule } from '@modules/workspace/workspace.repository.module';
import { WorkspaceUtilModule } from '@modules/workspace/workspace.util.module';
import { Module } from '@nestjs/common';

/** Workspace domain services backing `@Workspace*Protected` guards and the workspace HTTP layer. */
@Module({
    controllers: [],
    providers: [
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
    ],
    exports: [
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
    ],
    imports: [WorkspaceRepositoryModule, WorkspaceUtilModule],
})
export class WorkspaceModule {}
