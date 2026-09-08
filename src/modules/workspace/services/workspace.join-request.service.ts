import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    Prisma,
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { IWorkspaceJoinRequestCreate } from '@modules/workspace/interfaces/workspace.interface';
import { IWorkspaceJoinRequestService } from '@modules/workspace/interfaces/workspace.join-request.service.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceJoinRequestService implements IWorkspaceJoinRequestService {
    private readonly homeUrl: string;
    private readonly joinRequestReviewLinkPattern: string;

    constructor(
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly requestStoreService: RequestStoreService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService,
        private readonly notificationQueue: NotificationQueue,
        private readonly featureFlagService: FeatureFlagService
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;
        this.joinRequestReviewLinkPattern = this.configService.get<string>(
            'workspace.joinRequest.reviewLinkPattern'
        )!;
    }

    private async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
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
            this.workspaceJoinRequestRepository.findRequesterNameById(
                requesterId
            ),
            this.workspaceMemberRepository.findReviewersByWorkspace(
                workspace.id
            ),
        ]);
        const requesterName =
            requester?.name ?? requester?.username ?? 'A user';
        const link = this.joinRequestReviewLinkPattern
            .replace('{homeUrl}', this.homeUrl)
            .replace('{joinRequestId}', joinRequest.id);

        await Promise.all(
            reviewers.map(reviewer => {
                // Encrypted once per reviewer: the key is the reviewer's own
                // userId, so one shared ciphertext decrypts for nobody else.
                const encryptedJoinRequestReviewLink =
                    this.helperEncryptionService.aes256EncryptSimple(
                        link,
                        reviewer.userId
                    );

                return this.notificationQueue.sendWorkspaceJoinRequest(
                    reviewer.userId,
                    {
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        requesterName,
                        encryptedJoinRequestReviewLink,
                    },
                    requesterId
                );
            })
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

        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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

        const joinRequest =
            await this.workspaceJoinRequestRepository.createPending(
                {
                    workspaceId: workspace.id,
                    userId,
                    message: create.message,
                },
                requestLog
            );

        await this.sendJoinRequestNotifications(workspace, joinRequest, userId);

        return joinRequest;
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceJoinRequest>> {
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

        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const joinRequest = await this.validatePendingJoinRequest(
            workspaceJoinRequestId,
            workspace.id
        );

        await this.workspaceJoinRequestRepository.acceptForRequester(
            joinRequest,
            reviewerId,
            requestLog
        );

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

        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const joinRequest = await this.validatePendingJoinRequest(
            workspaceJoinRequestId,
            workspace.id
        );

        await this.workspaceJoinRequestRepository.rejectForRequester(
            workspaceJoinRequestId,
            workspace.id,
            reviewerId,
            rejectReasonCode,
            requestLog
        );

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
