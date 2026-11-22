import { AwsModule } from '@common/aws/aws.module';
import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceQueueFactory } from '@modules/workspace/factories/workspace.queue.factory';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceIdMiddleware } from '@modules/workspace/middlewares/workspace.id.middleware';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { NotificationModule } from '@modules/notification/notification.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        WorkspaceRepository,
        WorkspaceMemberRepository,
        WorkspaceInviteRepository,
        WorkspaceJoinRequestRepository,
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
        WorkspaceUtil,
        WorkspaceQueue,
        {
            provide: EnumWorkspaceQueue.workspace,
            useExisting: WorkspaceQueue,
        },
    ],
    exports: [
        WorkspaceService,
        WorkspaceMemberService,
        WorkspaceInviteService,
        WorkspaceJoinRequestService,
        WorkspaceUtil,
        WorkspaceQueue,
    ],
    imports: [
        ActivityLogModule,
        AwsModule,
        NotificationModule,
        BullModule.registerQueueAsync({
            name: EnumWorkspaceQueue.workspace,
            useClass: WorkspaceQueueFactory,
        }),
    ],
})
export class WorkspaceModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(WorkspaceIdMiddleware).forRoutes('{*wildcard}');
    }
}
