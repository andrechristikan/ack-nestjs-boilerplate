import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Module } from '@nestjs/common';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';
import { WorkspaceInviteAnalyticRepository } from '@modules/workspace/repositories/workspace.invite.analytic.repository';
import { WorkspaceJoinRequestAnalyticRepository } from '@modules/workspace/repositories/workspace.join-request.analytic.repository';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';

@Module({
    controllers: [],
    providers: [
        WorkspaceRepository,
        WorkspaceMemberRepository,
        WorkspaceInviteRepository,
        WorkspaceJoinRequestRepository,
        WorkspaceAnalyticRepository,
        WorkspaceInviteAnalyticRepository,
        WorkspaceJoinRequestAnalyticRepository,
        WorkspaceMemberAnalyticRepository,
    ],
    exports: [
        WorkspaceRepository,
        WorkspaceMemberRepository,
        WorkspaceInviteRepository,
        WorkspaceJoinRequestRepository,
        WorkspaceAnalyticRepository,
        WorkspaceInviteAnalyticRepository,
        WorkspaceJoinRequestAnalyticRepository,
        WorkspaceMemberAnalyticRepository,
    ],
    imports: [],
})
export class WorkspaceRepositoryModule {}
