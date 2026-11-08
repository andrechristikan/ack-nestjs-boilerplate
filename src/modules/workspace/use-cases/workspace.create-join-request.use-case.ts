import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceCreateJoinRequestUseCase implements IAppUseCase<
    [string, WorkspaceJoinRequestCreateRequestDto],
    IResponseReturn<WorkspaceJoinRequest>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue
    ) {}

    private async getReviewerRecipients(
        workspaceId: string
    ): Promise<INotificationRecipient[]> {
        const reviewerIds =
            await this.workspaceMemberService.getReviewerUserIds(workspaceId);
        const reviewers =
            await this.userService.getManyActiveByIds(reviewerIds);

        return Promise.all(
            reviewers.map(reviewer =>
                this.notificationService.getRecipient(
                    reviewer,
                    EnumNotificationKind.workspaceJoinRequest
                )
            )
        );
    }

    async execute(
        userId: string,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();
        const workspace =
            await this.workspaceJoinRequestService.getJoinableWorkspace(
                userId,
                workspaceId
            );

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }),
        ];

        const [requester, reviewerRecipients] = await Promise.all([
            this.userService.getNameById(userId),
            this.getReviewerRecipients(workspace.id),
        ]);
        const joinRequest =
            await this.workspaceJoinRequestService.createJoinRequest(userId, {
                workspaceId,
                message: message ?? null,
            });

        this.activityLogService.stagePrepared(activityLogs);

        if (reviewerRecipients.length > 0) {
            const joinRequestReviewLink =
                this.workspaceJoinRequestService.buildJoinRequestReviewLink(
                    joinRequest.id
                );
            const requesterName =
                this.workspaceJoinRequestService.resolveRequesterName(
                    requester
                );

            await this.notificationQueue.sendWorkspaceJoinRequestBulk(
                reviewerRecipients,
                {
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    requesterName,
                    joinRequestId: joinRequest.id,
                    joinRequestReviewLink,
                },
                userId
            );
        }

        return { data: joinRequest };
    }
}
