import { PasswordHistoryDomainModule } from '@modules/password-history/password-history.domain.module';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceQueueFactory } from '@modules/workspace/factories/workspace.queue.factory';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { WorkspaceRepositoryModule } from '@modules/workspace/workspace.repository.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueConfigKey } from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';
import { WorkspaceAnalyticDomain } from '@modules/workspace/domains/workspace.analytic.domain';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceJoinRequestAnalyticDomain } from '@modules/workspace/domains/workspace.join-request.analytic.domain';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';

/** Workspace domain services backing `@Workspace*Protected` guards and the workspace HTTP layer. */
@Module({
    controllers: [],
    providers: [
        WorkspaceDomain,
        WorkspaceMemberDomain,
        WorkspaceInviteDomain,
        WorkspaceJoinRequestDomain,
        WorkspaceUtil,
        WorkspaceQueue,
        WorkspaceAnalyticDomain,
        WorkspaceInviteAnalyticDomain,
        WorkspaceJoinRequestAnalyticDomain,
        WorkspaceMemberAnalyticDomain,
    ],
    exports: [
        BullModule,
        WorkspaceDomain,
        WorkspaceMemberDomain,
        WorkspaceInviteDomain,
        WorkspaceJoinRequestDomain,
        WorkspaceUtil,
        WorkspaceQueue,
        WorkspaceAnalyticDomain,
        WorkspaceInviteAnalyticDomain,
        WorkspaceJoinRequestAnalyticDomain,
        WorkspaceMemberAnalyticDomain,
    ],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumQueue.workspace,
            configKey: QueueConfigKey,
            useClass: WorkspaceQueueFactory,
        }),
        WorkspaceRepositoryModule,
        ProjectDomainModule,
        UserDomainModule,
        PasswordHistoryDomainModule,
    ],
})
export class WorkspaceDomainModule {}
