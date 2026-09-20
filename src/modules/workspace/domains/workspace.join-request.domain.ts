import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type { IWorkspaceJoinRequestCreate } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceJoinRequestDomain {
    private readonly homeUrl: string;
    private readonly joinRequestReviewLinkPattern: string;

    constructor(
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly userDomain: UserDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly notificationQueue: NotificationQueue,
        private readonly featureFlagDomain: FeatureFlagDomain
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;
        this.joinRequestReviewLinkPattern = this.configService.get<string>(
            'workspace.joinRequest.reviewLinkPattern'
        )!;
    }

    private async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'joinRequestAllowed'
        );
    }

    private async sendJoinRequestNotifications(
        workspace: Workspace,
        joinRequest: WorkspaceJoinRequest,
        requesterId: string
    ): Promise<void> {
        const [requester, reviewers] = await Promise.all([
            this.userDomain.getNameById(requesterId),
            this.workspaceMemberRepository.findReviewersByWorkspace(
                workspace.id
            ),
        ]);
        const requesterName =
            requester?.name ?? requester?.username ?? 'A user';
        const link = this.helperStringService.fillPattern(
            this.joinRequestReviewLinkPattern,
            { homeUrl: this.homeUrl, joinRequestId: joinRequest.id }
        );

        await Promise.all(
            reviewers.map(reviewer =>
                this.notificationQueue.sendWorkspaceJoinRequest(
                    reviewer.userId,
                    {
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        requesterName,
                        joinRequestReviewLink: link,
                    },
                    requesterId
                )
            )
        );
    }

    private async validatePendingJoinRequest(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest> {
        const joinRequest =
            await this.workspaceJoinRequestRepository.findByIdAndWorkspace(
                workspaceJoinRequestId,
                workspaceId
            );
        if (!joinRequest) {
            throw new WorkspaceJoinRequestNotFoundException();
        } else if (
            joinRequest.status !== EnumWorkspaceJoinRequestStatus.pending
        ) {
            throw new WorkspaceJoinRequestAlreadyProcessedException();
        }

        return joinRequest;
    }

    async createJoinRequest(
        userId: string,
        create: IWorkspaceJoinRequestCreate
    ): Promise<WorkspaceJoinRequest> {
        await this.assertJoinRequestAllowed();

        const workspace = await this.workspaceRepository.findActiveById(
            create.workspaceId
        );
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        } else if (!workspace.isPublic) {
            throw new WorkspaceNotPublicException();
        }

        const [existingMember, duplicate] = await Promise.all([
            this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspace.id,
                userId
            ),
            this.workspaceJoinRequestRepository.existsPendingByWorkspaceAndUser(
                workspace.id,
                userId
            ),
        ]);
        if (existingMember) {
            throw new WorkspaceJoinRequestAlreadyMemberException();
        } else if (duplicate) {
            throw new WorkspaceJoinRequestDuplicateException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId: userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }),
        ];

        const joinRequest =
            await this.workspaceJoinRequestRepository.createPending({
                workspaceId: workspace.id,
                userId,
                message: create.message,
            });

        this.activityLogDomain.stagePrepared(events);

        await this.sendJoinRequestNotifications(workspace, joinRequest, userId);

        return joinRequest;
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        await this.assertJoinRequestAllowed();

        return this.workspaceJoinRequestRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status
        );
    }

    async acceptJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<void> {
        await this.assertJoinRequestAllowed();

        const joinRequest = await this.validatePendingJoinRequest(
            workspaceJoinRequestId,
            workspace.id
        );
        const reviewedAt = this.helperDateService.create();
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceJoinAccepted,
                userId: reviewerId,
                createdBy: reviewerId,
                workspaceId: joinRequest.workspaceId,
                metadata: { targetUserId: joinRequest.userId },
            }),
        ];
        if (joinRequest.userId !== reviewerId) {
            const workspaceJoinAcceptedByAdminEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                    userId: joinRequest.userId,
                    createdBy: reviewerId,
                    workspaceId: joinRequest.workspaceId,
                    metadata: { actorUserId: reviewerId },
                });
            events.push(workspaceJoinAcceptedByAdminEvent);
        }

        await this.databaseService.withTransaction(async tx => {
            await this.workspaceMemberDomain.createInTx(
                tx,
                joinRequest.workspaceId,
                joinRequest.userId,
                EnumWorkspaceMemberRole.member,
                reviewerId
            );
            await this.workspaceJoinRequestRepository.acceptInTx(
                tx,
                joinRequest.id,
                reviewerId,
                reviewedAt
            );
        });

        this.activityLogDomain.stagePrepared(events);

        await this.notificationQueue.sendWorkspaceJoinAccepted(
            joinRequest.userId,
            {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
            },
            reviewerId
        );
    }

    async rejectJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason
    ): Promise<void> {
        await this.assertJoinRequestAllowed();

        const joinRequest = await this.validatePendingJoinRequest(
            workspaceJoinRequestId,
            workspace.id
        );
        const reviewedAt = this.helperDateService.create();

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceJoinRejected,
                userId: reviewerId,
                createdBy: reviewerId,
                workspaceId: workspace.id,
                metadata: { targetUserId: joinRequest.userId },
            }),
        ];
        if (joinRequest.userId !== reviewerId) {
            const workspaceJoinRejectedByAdminEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                    userId: joinRequest.userId,
                    createdBy: reviewerId,
                    workspaceId: workspace.id,
                    metadata: { actorUserId: reviewerId },
                });
            events.push(workspaceJoinRejectedByAdminEvent);
        }

        await this.workspaceJoinRequestRepository.reject(
            workspaceJoinRequestId,
            reviewerId,
            rejectReasonCode,
            reviewedAt
        );

        this.activityLogDomain.stagePrepared(events);

        await this.notificationQueue.sendWorkspaceJoinRejected(
            joinRequest.userId,
            {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                rejectReasonCode,
            },
            reviewerId
        );
    }
}
