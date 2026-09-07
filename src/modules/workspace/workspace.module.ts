import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteUtil } from '@modules/workspace/utils/workspace.invite.util';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { WorkspaceRepositoryModule } from '@modules/workspace/workspace.repository.module';
import { Module } from '@nestjs/common';

/** Workspace domain services backing `@Workspace*Protected` guards and the workspace HTTP layer. */
@Module({
    controllers: [],
    providers: [
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
        WorkspaceUtil,
        WorkspaceInviteUtil,
    ],
    exports: [
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
        WorkspaceUtil,
        WorkspaceInviteUtil,
    ],
    imports: [WorkspaceRepositoryModule],
})
export class WorkspaceModule {}
