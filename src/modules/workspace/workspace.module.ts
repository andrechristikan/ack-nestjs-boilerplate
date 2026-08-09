import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceActivityLogUtil } from '@modules/workspace/utils/workspace.activity-log.util';
import { WorkspaceInviteUtil } from '@modules/workspace/utils/workspace.invite.util';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Module } from '@nestjs/common';

/** Workspace guard/service layer backing `@Workspace*Protected`; HTTP controllers are registered on the router modules. */
@Module({
    imports: [],
    exports: [
        WorkspaceService,
        WorkspaceProcessorService,
        WorkspaceRepository,
        WorkspaceMemberRepository,
        WorkspaceInviteRepository,
        WorkspaceJoinRequestRepository,
        WorkspaceUtil,
        WorkspaceActivityLogUtil,
        WorkspaceInviteUtil,
    ],
    providers: [
        WorkspaceService,
        WorkspaceProcessorService,
        WorkspaceRepository,
        WorkspaceMemberRepository,
        WorkspaceInviteRepository,
        WorkspaceJoinRequestRepository,
        WorkspaceUtil,
        WorkspaceActivityLogUtil,
        WorkspaceInviteUtil,
    ],
    controllers: [],
})
export class WorkspaceModule {}
