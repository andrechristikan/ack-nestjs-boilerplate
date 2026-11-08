import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceAcceptJoinRequestUseCase implements IAppUseCase<
    [Workspace, string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue
    ) {}

    private prepareReviewActivityLogs(
        action: EnumActivityLogAction,
        byAdminAction: EnumActivityLogAction,
        workspaceId: string,
        reviewerId: string,
        joinRequest: WorkspaceJoinRequest
    ): IActivityLogStaged[] {
        const activityLogs = [
            this.activityLogService.prepare({
                action,
                userId: reviewerId,
                createdBy: reviewerId,
                workspaceId,
                metadata: { targetUserId: joinRequest.userId },
            }),
        ];
        if (joinRequest.userId !== reviewerId) {
            const byAdminActivityLog = this.activityLogService.prepare({
                action: byAdminAction,
                userId: joinRequest.userId,
                createdBy: reviewerId,
                workspaceId,
                metadata: { actorUserId: reviewerId },
            });
            activityLogs.push(byAdminActivityLog);
        }

        return activityLogs;
    }

    async execute(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();
        const joinRequest =
            await this.workspaceJoinRequestService.getPendingById(
                workspaceJoinRequestId,
                workspace.id
            );

        const activityLogs = this.prepareReviewActivityLogs(
            EnumActivityLogAction.workspaceJoinAccepted,
            EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
            workspace.id,
            reviewerId,
            joinRequest
        );

        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.workspaceJoinRequestService.getRequesterRecipient(
                joinRequest.userId,
                EnumNotificationKind.workspaceJoinAccepted
            );
        await this.workspaceJoinRequestService.acceptJoinRequest(
            joinRequest,
            reviewerId
        );

        this.activityLogService.stagePrepared(activityLogs);

        if (recipient) {
            await this.notificationQueue.sendWorkspaceJoinAccepted(
                recipient,
                { workspaceId: workspace.id, workspaceName: workspace.name },
                reviewerId,
                joinRequest.id
            );
        }

        return {};
    }
}
