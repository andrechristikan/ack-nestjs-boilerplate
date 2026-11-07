import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceQueueFactory } from '@modules/workspace/factories/workspace.queue.factory';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { WorkspaceAnalyticRepository } from '@modules/workspace/repositories/workspace.analytic.repository';
import { WorkspaceInviteAnalyticRepository } from '@modules/workspace/repositories/workspace.invite.analytic.repository';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestAnalyticRepository } from '@modules/workspace/repositories/workspace.join-request.analytic.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberAnalyticRepository } from '@modules/workspace/repositories/workspace.member.analytic.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceAnalyticService } from '@modules/workspace/services/workspace.analytic.service';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberAnalyticService } from '@modules/workspace/services/workspace.member.analytic.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

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
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
        WorkspaceUtil,
        WorkspaceQueue,
        WorkspaceAnalyticService,
        WorkspaceInviteAnalyticService,
        WorkspaceJoinRequestAnalyticService,
        WorkspaceMemberAnalyticService,
    ],
    exports: [
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
        WorkspaceUtil,
        WorkspaceQueue,
        WorkspaceAnalyticService,
        WorkspaceInviteAnalyticService,
        WorkspaceJoinRequestAnalyticService,
        WorkspaceMemberAnalyticService,
    ],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumWorkspaceQueue.workspace,
            useClass: WorkspaceQueueFactory,
        }),
    ],
})
export class WorkspaceModule {}
