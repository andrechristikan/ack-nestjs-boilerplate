import type { Prisma } from '@generated/prisma-client/client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { RoleService } from '@modules/role/services/role.service';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
    EnumRoleScope,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IUserName } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceJoinRequestNoncePattern } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type {
    IWorkspaceJoinRequestCreate,
    IWorkspaceJoinRequestNotice,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
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
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly roleService: RoleService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly databaseUtil: DatabaseUtil,
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
        const reviewerEntry = this.activityLogService.recordEffect(
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

        const requesterEntry = this.activityLogService.recordEffect(
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
    ): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        } else if (!workspace.isPublic) {
            throw new WorkspaceNotPublicException();
        }

        const existingMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspace.id,
                userId
            );
        if (existingMember) {
            throw new WorkspaceJoinRequestAlreadyMemberException();
        }

        return workspace;
    }

    /** Creates the pending request and adds one notification row per reviewer and the requester's activity entry in one transaction, dispatched after the commit. */
    async createJoinRequest(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        create: IWorkspaceJoinRequestCreate,
        {
            workspaceName,
            requesterName,
            reviewerIds,
        }: IWorkspaceJoinRequestNotice
    ): Promise<WorkspaceJoinRequest> {
        const userId = authContext.userId;
        const noncePattern = this.helperStringService.fillPattern(
            WorkspaceJoinRequestNoncePattern,
            { workspaceId: create.workspaceId, userId }
        );
        const nonce = this.helperHashService.sha256Hash(noncePattern);
        const expiresInDays = await this.featureFlagService.getMetadataNumber(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.joinRequestExpiresInDays
        );
        const now = this.helperDateService.create();
        const duration = this.helperDateService.createDuration({
            days: expiresInDays,
        });
        const expiredAt = this.helperDateService.forward(now, duration);

        try {
            return await this.outboxService.withTransaction(async tx => {
                const joinRequest =
                    await this.workspaceJoinRequestRepository.createPendingInTx(
                        tx,
                        {
                            workspaceId: create.workspaceId,
                            userId,
                            message: create.message,
                            expiredAt,
                            nonce,
                        }
                    );
                const joinRequestReviewLink = this.buildJoinRequestReviewLink(
                    joinRequest.id
                );
                const effects = reviewerIds.map(reviewerId =>
                    this.notificationService.notify(
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
                await this.outboxService.addManyInTx(tx, effects);
                const entry = this.activityLogService.recordEffect(
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
                await this.outboxService.addInTx(tx, entry);

                return joinRequest;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'nonce'
            );
            if (isDuplicate) {
                throw new WorkspaceJoinRequestDuplicateException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceJoinRequestDuplicateException();
            }

            throw new AppUnknownException(err);
        }
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams,
        status: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceJoinRequestWhereInput | null
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        return this.workspaceJoinRequestRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status,
            additionalWhere
        );
    }

    async getPendingById(
        workspaceJoinRequestId: string,
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceJoinRequestWhereInput | null
    ): Promise<WorkspaceJoinRequest> {
        const joinRequest =
            await this.workspaceJoinRequestRepository.findByIdAndWorkspace(
                workspaceJoinRequestId,
                workspaceId,
                additionalWhere
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

    /** Accepts the request, adds the member, the requester's notification row, and the activity entries in one transaction, dispatched after the commit. */
    async acceptJoinRequest(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        joinRequest: WorkspaceJoinRequest,
        workspaceName: string
    ): Promise<void> {
        const reviewerId = authContext.userId;
        const reviewedAt = this.helperDateService.create();

        const memberRole = await this.roleService.getRefByScopeAndKey(
            EnumRoleScope.workspace,
            EnumRoleWorkspaceKey.member
        );
        try {
            await this.outboxService.withTransaction(async tx => {
                const accepted =
                    await this.workspaceJoinRequestRepository.acceptInTx(
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
                    memberRole.id,
                    reviewerId
                );
                const email = await this.userService.getEmailByIdInTx(
                    tx,
                    joinRequest.userId
                );
                if (email !== null) {
                    await this.workspaceInviteService.revokePendingByEmailInTx(
                        tx,
                        joinRequest.workspaceId,
                        email
                    );
                }

                const effect = this.notificationService.notify(
                    EnumNotificationKind.workspaceJoinAccepted,
                    {
                        userId: joinRequest.userId,
                        proceedBy: reviewerId,
                        workspaceId: joinRequest.workspaceId,
                        workspaceName,
                        joinRequestId: joinRequest.id,
                    }
                );
                await this.outboxService.addInTx(tx, effect);
                const entries = this.reviewActivityEffects(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumActivityLogAction.workspaceJoinAccepted,
                    EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
                    joinRequest
                );
                await this.outboxService.addManyInTx(tx, entries);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isAlreadyMember = this.databaseUtil.isUniqueCollision(
                err,
                'userId'
            );
            if (isAlreadyMember) {
                throw new WorkspaceJoinRequestAlreadyMemberException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceJoinRequestAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Rejects the request and adds the requester's notification row and the activity entries in one transaction, dispatched after the commit. */
    async rejectJoinRequest(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        joinRequest: WorkspaceJoinRequest,
        workspaceName: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason
    ): Promise<void> {
        const reviewerId = authContext.userId;
        const reviewedAt = this.helperDateService.create();
        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${rejectReasonCode}`
        );

        try {
            await this.outboxService.withTransaction(async tx => {
                const rejected =
                    await this.workspaceJoinRequestRepository.rejectInTx(
                        tx,
                        joinRequest.id,
                        reviewerId,
                        rejectReasonCode,
                        reviewedAt
                    );
                if (!rejected) {
                    throw new WorkspaceJoinRequestAlreadyProcessedException();
                }

                const effect = this.notificationService.notify(
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
                await this.outboxService.addInTx(tx, effect);
                const entries = this.reviewActivityEffects(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumActivityLogAction.workspaceJoinRejected,
                    EnumActivityLogAction.workspaceJoinRejectedByAdmin,
                    joinRequest
                );
                await this.outboxService.addManyInTx(tx, entries);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceJoinRequestAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceJoinRequestRepository.expireStalePending();
    }

    async cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await this.workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx(
            tx,
            workspaceId
        );
    }

    async cancelPendingByRequesterInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.workspaceJoinRequestRepository.cancelPendingByRequesterInTx(
            tx,
            userId
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

    resolveRequesterName(requester: IUserName | null): string {
        const name = requester?.name ?? requester?.username ?? null;
        if (name !== null) {
            return name;
        }

        return this.messageService.setMessage(
            'workspace.joinRequest.requesterFallbackName'
        );
    }
}
