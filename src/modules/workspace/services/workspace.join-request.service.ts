import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { WorkspaceJoinRequestNoncePattern } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type {
    IWorkspaceJoinRequestCreate,
    IWorkspaceJoinRequestNotice,
    IWorkspaceJoinRequestPrepared,
    IWorkspaceJoinRequestWithEmail,
    IWorkspaceJoinable,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceJoinRequestService {
    private readonly baseUrl: string;
    private readonly reviewLinkPattern: string;

    constructor(
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly notificationQueue: NotificationQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly featureFlagService: FeatureFlagService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.baseUrl = this.configService.get<string>('frontend.baseUrl')!;
        this.reviewLinkPattern = this.configService.get<string>(
            'workspace.joinRequest.reviewLinkPattern'
        )!;
    }

    private buildJoinRequestReviewLink(joinRequestId: string): string {
        return this.helperStringService.fillPattern(this.reviewLinkPattern, {
            frontendBaseUrl: this.baseUrl,
            joinRequestId,
        });
    }

    private reviewActivityEffects(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        action: EnumActivityLogAction,
        byAdminAction: EnumActivityLogAction,
        joinRequest: WorkspaceJoinRequest
    ): IOutboxEffect[] {
        const reviewerId = authContext.userId;
        const reviewerEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action,
                userId: reviewerId,
                createdBy: reviewerId,
                workspaceId: joinRequest.workspaceId,
                metadata: { targetUserId: joinRequest.userId },
            }
        );
        if (joinRequest.userId === reviewerId) {
            return [reviewerEntry];
        }

        const requesterEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: byAdminAction,
                userId: joinRequest.userId,
                createdBy: reviewerId,
                workspaceId: joinRequest.workspaceId,
                metadata: { actorUserId: reviewerId },
            }
        );

        return [reviewerEntry, requesterEntry];
    }

    async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.joinRequestAllowed
        );
    }

    async getJoinableWorkspace(
        userId: string,
        workspaceId: string
    ): Promise<IWorkspaceJoinable> {
        const row =
            await this.workspaceRepository.findActiveByIdWithJoinMembers(
                workspaceId,
                userId
            );
        if (!row) {
            throw new WorkspaceNotFoundException();
        } else if (!row.isPublic) {
            throw new WorkspaceNotPublicException();
        }

        const { members, ...workspace } = row;
        const isMember = members.some(member => member.userId === userId);
        if (isMember) {
            throw new WorkspaceJoinRequestAlreadyMemberException();
        }

        return { workspace, reviewerIds: members.map(member => member.userId) };
    }

    /** Hashes the workspace-and-user nonce and reads the expiry from the `workspace` flag; call it before the transaction. */
    async prepareJoinRequest(
        authContext: IAuthJwtAccessContext,
        { workspaceId }: IWorkspaceJoinRequestCreate
    ): Promise<IWorkspaceJoinRequestPrepared> {
        const noncePattern = this.helperStringService.fillPattern(
            WorkspaceJoinRequestNoncePattern,
            { workspaceId, userId: authContext.userId }
        );
        const nonce = this.helperHashService.sha256Hash(noncePattern);
        const expiresInDays = await this.featureFlagService.getMetadataNumber(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.joinRequestExpiresInDays
        );
        const now = this.helperDateService.now();
        const duration = this.helperDateService.createDuration({
            days: expiresInDays,
        });
        const expiredAt = this.helperDateService.forward(now, duration);

        return { nonce, expiredAt };
    }

    async createJoinRequestInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        create: IWorkspaceJoinRequestCreate,
        { nonce, expiredAt }: IWorkspaceJoinRequestPrepared,
        {
            workspaceName,
            requesterName,
            reviewerIds,
        }: IWorkspaceJoinRequestNotice
    ): Promise<WorkspaceJoinRequest> {
        const userId = authContext.userId;
        const joinRequest =
            await this.workspaceJoinRequestRepository.createPendingInTx(tx, {
                workspaceId: create.workspaceId,
                userId,
                message: create.message,
                expiredAt,
                nonce,
            });
        const joinRequestReviewLink = this.buildJoinRequestReviewLink(
            joinRequest.id
        );
        const effects = reviewerIds.map(reviewerId =>
            this.notificationQueue.notify(
                EnumNotificationKind.workspaceJoinRequest,
                {
                    userId: reviewerId,
                    proceedBy: userId,
                    workspaceId: create.workspaceId,
                    workspaceName,
                    requesterName,
                    joinRequestId: joinRequest.id,
                    joinRequestReviewLink,
                }
            )
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId,
                createdBy: userId,
                workspaceId: create.workspaceId,
            }
        );
        await this.outboxService.addManyInTx(tx, [...effects, entry]);

        return joinRequest;
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        return this.workspaceJoinRequestRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status ?? null
        );
    }

    async getPendingById(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<IWorkspaceJoinRequestWithEmail> {
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

    async acceptJoinRequestInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        joinRequest: IWorkspaceJoinRequestWithEmail,
        workspaceName: string
    ): Promise<void> {
        const reviewerId = authContext.userId;
        const reviewedAt = this.helperDateService.now();

        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        const accepted = await this.workspaceJoinRequestRepository.acceptInTx(
            tx,
            joinRequest.id,
            reviewerId,
            reviewedAt
        );
        if (!accepted) {
            throw new WorkspaceJoinRequestAlreadyProcessedException();
        }

        await this.workspaceMemberService.createInTx(
            tx,
            joinRequest.workspaceId,
            joinRequest.userId,
            EnumWorkspaceMemberRole.member,
            reviewerId
        );
        await this.workspaceInviteService.revokePendingByEmailInTx(
            tx,
            joinRequest.workspaceId,
            joinRequest.user.email
        );

        const effect = this.notificationQueue.notify(
            EnumNotificationKind.workspaceJoinAccepted,
            {
                userId: joinRequest.userId,
                proceedBy: reviewerId,
                workspaceId: joinRequest.workspaceId,
                workspaceName,
                joinRequestId: joinRequest.id,
            }
        );
        const entries = this.reviewActivityEffects(
            requestContext,
            apiKeyContext,
            authContext,
            EnumActivityLogAction.workspaceJoinAccepted,
            EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
            joinRequest
        );
        await this.outboxService.addManyInTx(tx, [effect, ...entries]);
    }

    async rejectJoinRequestInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        joinRequest: WorkspaceJoinRequest,
        workspaceName: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason
    ): Promise<void> {
        const reviewerId = authContext.userId;
        const reviewedAt = this.helperDateService.now();
        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${rejectReasonCode}`
        );

        const rejected = await this.workspaceJoinRequestRepository.rejectInTx(
            tx,
            joinRequest.id,
            reviewerId,
            rejectReasonCode,
            reviewedAt
        );
        if (!rejected) {
            throw new WorkspaceJoinRequestAlreadyProcessedException();
        }

        const effect = this.notificationQueue.notify(
            EnumNotificationKind.workspaceJoinRejected,
            {
                userId: joinRequest.userId,
                proceedBy: reviewerId,
                workspaceId: joinRequest.workspaceId,
                workspaceName,
                joinRequestId: joinRequest.id,
                rejectReasonCode,
                rejectReasonLabel,
            }
        );
        const entries = this.reviewActivityEffects(
            requestContext,
            apiKeyContext,
            authContext,
            EnumActivityLogAction.workspaceJoinRejected,
            EnumActivityLogAction.workspaceJoinRejectedByAdmin,
            joinRequest
        );
        await this.outboxService.addManyInTx(tx, [effect, ...entries]);
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceJoinRequestRepository.expireStalePending();
    }

    async cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        updatedBy: string
    ): Promise<void> {
        await this.workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx(
            tx,
            workspaceId,
            updatedBy
        );
    }

    async cancelPendingByRequesterInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<void> {
        await this.workspaceJoinRequestRepository.cancelPendingByRequesterInTx(
            tx,
            userId,
            updatedBy
        );
    }

    async cancelPendingByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        return this.workspaceJoinRequestRepository.cancelPendingByUserInTx(
            tx,
            workspaceId,
            userId
        );
    }
}
