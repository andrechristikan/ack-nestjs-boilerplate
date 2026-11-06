import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import {
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
    WorkspaceJoinRequestUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestHttpService {
    constructor(
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly userDomain: UserDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly notificationQueue: NotificationQueue,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.joinRequestAllowed
        );
    }

    private async getReviewerRecipients(
        workspaceId: string
    ): Promise<INotificationRecipient[]> {
        const reviewerIds =
            await this.workspaceMemberDomain.getReviewerUserIds(workspaceId);
        const reviewers = await this.userDomain.getManyActiveByIds(reviewerIds);

        return Promise.all(
            reviewers.map(reviewer =>
                this.notificationDomain.getRecipient(
                    reviewer,
                    EnumNotificationKind.workspaceJoinRequest
                )
            )
        );
    }

    private async getRequesterRecipient(
        requesterId: string,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient | null> {
        const user = await this.userDomain.getOneActive(requesterId);
        if (user === null) {
            return null;
        }

        return this.notificationDomain.getRecipient(user, kind);
    }

    private prepareReviewActivityLogs(
        action: EnumActivityLogAction,
        byAdminAction: EnumActivityLogAction,
        workspaceId: string,
        reviewerId: string,
        joinRequest: WorkspaceJoinRequest
    ): IActivityLogStaged[] {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action,
                userId: reviewerId,
                createdBy: reviewerId,
                workspaceId,
                metadata: { targetUserId: joinRequest.userId },
            }),
        ];
        if (joinRequest.userId !== reviewerId) {
            const byAdminActivityLog = this.activityLogDomain.prepare({
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

    async createJoinRequest(
        userId: string,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards
        await this.assertJoinRequestAllowed();
        const workspace =
            await this.workspaceJoinRequestDomain.getJoinableWorkspace(
                userId,
                workspaceId
            );

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }),
        ];

        const [requester, reviewerRecipients] = await Promise.all([
            this.userDomain.getNameById(userId),
            this.getReviewerRecipients(workspace.id),
        ]);
        // Sequential by design: write must not run if an earlier step throws
        const joinRequest =
            await this.workspaceJoinRequestDomain.createJoinRequest(userId, {
                workspaceId,
                message: message ?? null,
            });

        this.activityLogDomain.stagePrepared(activityLogs);

        if (reviewerRecipients.length > 0) {
            const joinRequestReviewLink =
                this.workspaceUtil.buildJoinRequestReviewLink(joinRequest.id);
            const requesterName =
                this.workspaceUtil.resolveRequesterName(requester);

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

    async getJoinRequestsList(
        workspaceId: string,
        query: WorkspaceJoinRequestListRequestDto
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards
        await this.assertJoinRequestAllowed();

        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceJoinRequestWhereInput>(
                query,
                {
                    scope: WorkspaceJoinRequestUserListCursorScope,
                    availableOrderBy:
                        WorkspaceJoinRequestDefaultAvailableOrderBy,
                }
            );
        const status = this.paginationFilterUtil.inEnum(
            Prisma.WorkspaceJoinRequestScalarFieldEnum.status,
            query.status,
            WorkspaceJoinRequestDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceJoinRequestDomain.getJoinRequestsList(
                workspaceId,
                params,
                status?.where
            );

        return {
            data,
            ...others,
        };
    }

    async acceptJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.assertJoinRequestAllowed();
        const joinRequest =
            await this.workspaceJoinRequestDomain.getPendingById(
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
        const recipient = await this.getRequesterRecipient(
            joinRequest.userId,
            EnumNotificationKind.workspaceJoinAccepted
        );
        await this.workspaceJoinRequestDomain.acceptJoinRequest(
            joinRequest,
            reviewerId
        );

        this.activityLogDomain.stagePrepared(activityLogs);

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

    async rejectJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string,
        { rejectReasonCode }: WorkspaceJoinRequestRejectRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.assertJoinRequestAllowed();
        const joinRequest =
            await this.workspaceJoinRequestDomain.getPendingById(
                workspaceJoinRequestId,
                workspace.id
            );

        const activityLogs = this.prepareReviewActivityLogs(
            EnumActivityLogAction.workspaceJoinRejected,
            EnumActivityLogAction.workspaceJoinRejectedByAdmin,
            workspace.id,
            reviewerId,
            joinRequest
        );

        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.getRequesterRecipient(
            joinRequest.userId,
            EnumNotificationKind.workspaceJoinRejected
        );
        await this.workspaceJoinRequestDomain.rejectJoinRequest(
            joinRequest.id,
            reviewerId,
            rejectReasonCode
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        if (recipient) {
            await this.notificationQueue.sendWorkspaceJoinRejected(
                recipient,
                {
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    rejectReasonCode,
                },
                reviewerId,
                joinRequest.id
            );
        }

        return {};
    }
}
