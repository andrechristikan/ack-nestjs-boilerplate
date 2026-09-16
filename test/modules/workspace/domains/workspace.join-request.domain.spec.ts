import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import {
    EnumActivityLogAction,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    type Workspace,
    type WorkspaceJoinRequest,
    type WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { ConfigService } from '@nestjs/config';
import { createDatabaseServiceMock } from '@test/support/database.mock';

describe('WorkspaceJoinRequestDomain', () => {
    const joinRepository = createMock<WorkspaceJoinRequestRepository>();
    const memberRepository = createMock<WorkspaceMemberRepository>();
    const workspaceRepository = createMock<WorkspaceRepository>();
    const memberDomain = createMock<WorkspaceMemberDomain>();
    const userDomain = createMock<UserDomain>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createDatabaseServiceMock();
    const encryptionService = createMock<HelperEncryptionService>();
    const dateService = createMock<HelperDateService>();
    const configService = createMock<ConfigService>();
    const notificationQueue = createMock<NotificationQueue>();
    const featureFlagDomain = createMock<FeatureFlagDomain>();
    const workspace = createMock<Workspace>({
        id: 'workspace-id',
        name: 'Workspace',
        isPublic: true,
    });
    const joinRequest = createMock<WorkspaceJoinRequest>({
        id: 'join-id',
        workspaceId: 'workspace-id',
        userId: 'requester-id',
        status: EnumWorkspaceJoinRequestStatus.pending,
    });

    let domain: WorkspaceJoinRequestDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        configService.get.mockImplementation(key => {
            if (key === 'home.url') return 'https://example.com';
            if (key === 'workspace.joinRequest.reviewLinkPattern') {
                return '{homeUrl}/join/{joinRequestId}';
            }
            return undefined;
        });
        domain = new WorkspaceJoinRequestDomain(
            joinRepository,
            memberRepository,
            workspaceRepository,
            memberDomain,
            userDomain,
            activityLogDomain,
            databaseService,
            encryptionService,
            dateService,
            configService,
            notificationQueue,
            featureFlagDomain
        );
    });

    it('checks the join-request feature before loading a workspace', async () => {
        const error = new Error('disabled');
        featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(error);
        await expect(
            domain.createJoinRequest('user-id', {
                workspaceId: 'workspace-id',
            })
        ).rejects.toBe(error);
        expect(workspaceRepository.findActiveById).not.toHaveBeenCalled();
    });

    it('rejects a missing or private workspace', async () => {
        workspaceRepository.findActiveById.mockResolvedValueOnce(null);
        await expect(
            domain.createJoinRequest('user-id', {
                workspaceId: 'workspace-id',
            })
        ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        workspaceRepository.findActiveById.mockResolvedValueOnce(
            createMock<Workspace>({ id: 'workspace-id', isPublic: false })
        );
        await expect(
            domain.createJoinRequest('user-id', {
                workspaceId: 'workspace-id',
            })
        ).rejects.toBeInstanceOf(WorkspaceNotPublicException);
    });

    it('rejects an existing member before a duplicate request', async () => {
        workspaceRepository.findActiveById.mockResolvedValue(workspace);
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
            createMock<WorkspaceMember>()
        );
        joinRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(true);
        await expect(
            domain.createJoinRequest('user-id', {
                workspaceId: 'workspace-id',
            })
        ).rejects.toBeInstanceOf(WorkspaceJoinRequestAlreadyMemberException);
    });

    it('rejects a duplicate pending request', async () => {
        workspaceRepository.findActiveById.mockResolvedValue(workspace);
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);
        joinRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(true);
        await expect(
            domain.createJoinRequest('user-id', {
                workspaceId: 'workspace-id',
            })
        ).rejects.toBeInstanceOf(WorkspaceJoinRequestDuplicateException);
    });

    it('creates a request, stages activity, and notifies reviewers', async () => {
        workspaceRepository.findActiveById.mockResolvedValue(workspace);
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);
        joinRepository.existsPendingByWorkspaceAndUser.mockResolvedValue(false);
        joinRepository.createPendingInTx.mockResolvedValue(joinRequest);
        userDomain.getNameById.mockResolvedValue({
            name: 'Requester',
            username: 'requester',
        });
        memberRepository.findReviewersByWorkspace.mockResolvedValue([
            { userId: 'reviewer-id' },
        ]);
        encryptionService.aes256EncryptSimple.mockReturnValue('encrypted-link');

        await expect(
            domain.createJoinRequest('requester-id', {
                workspaceId: 'workspace-id',
                message: 'Let me in',
            })
        ).resolves.toBe(joinRequest);
        expect(activityLogDomain.stage).toHaveBeenCalledWith({
            action: EnumActivityLogAction.workspaceJoinRequested,
            userId: 'requester-id',
            workspaceId: 'workspace-id',
        });
        expect(notificationQueue.sendWorkspaceJoinRequest).toHaveBeenCalledWith(
            'reviewer-id',
            {
                workspaceId: 'workspace-id',
                workspaceName: 'Workspace',
                requesterName: 'Requester',
                encryptedJoinRequestReviewLink: 'encrypted-link',
            },
            'requester-id'
        );
    });

    it.each([
        [null, WorkspaceJoinRequestNotFoundException],
        [
            createMock<WorkspaceJoinRequest>({
                status: EnumWorkspaceJoinRequestStatus.accepted,
            }),
            WorkspaceJoinRequestAlreadyProcessedException,
        ],
    ])(
        'rejects an unavailable request during acceptance',
        async (row, ExceptionClass) => {
            joinRepository.findByIdAndWorkspace.mockResolvedValue(row);
            await expect(
                domain.acceptJoinRequest(workspace, 'reviewer-id', 'join-id')
            ).rejects.toBeInstanceOf(ExceptionClass);
        }
    );

    it('accepts a pending request and creates a member atomically', async () => {
        const reviewedAt = new Date('2026-01-01T00:00:00.000Z');
        joinRepository.findByIdAndWorkspace.mockResolvedValue(joinRequest);
        dateService.create.mockReturnValue(reviewedAt);
        await domain.acceptJoinRequest(workspace, 'reviewer-id', 'join-id');
        expect(memberDomain.createInTx).toHaveBeenCalledWith(
            expect.anything(),
            'workspace-id',
            'requester-id',
            EnumWorkspaceMemberRole.member,
            'reviewer-id'
        );
        expect(joinRepository.acceptInTx).toHaveBeenCalledWith(
            expect.anything(),
            'join-id',
            'reviewer-id',
            reviewedAt
        );
        expect(
            notificationQueue.sendWorkspaceJoinAccepted
        ).toHaveBeenCalledWith(
            'requester-id',
            { workspaceId: 'workspace-id', workspaceName: 'Workspace' },
            'reviewer-id'
        );
    });

    it('checks the join-request feature before loading the request to reject', async () => {
        const error = new Error('disabled');
        featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(error);
        await expect(
            domain.rejectJoinRequest(
                workspace,
                'reviewer-id',
                'join-id',
                EnumWorkspaceJoinRejectReason.other
            )
        ).rejects.toBe(error);
        expect(joinRepository.findByIdAndWorkspace).not.toHaveBeenCalled();
    });

    it.each([
        [null, WorkspaceJoinRequestNotFoundException],
        [
            createMock<WorkspaceJoinRequest>({
                status: EnumWorkspaceJoinRequestStatus.rejected,
            }),
            WorkspaceJoinRequestAlreadyProcessedException,
        ],
    ])(
        'rejects an unavailable request during rejection',
        async (row, ExceptionClass) => {
            joinRepository.findByIdAndWorkspace.mockResolvedValue(row);
            await expect(
                domain.rejectJoinRequest(
                    workspace,
                    'reviewer-id',
                    'join-id',
                    EnumWorkspaceJoinRejectReason.other
                )
            ).rejects.toBeInstanceOf(ExceptionClass);
        }
    );

    it('rejects a pending request and notifies the requester', async () => {
        const reviewedAt = new Date('2026-01-01T00:00:00.000Z');
        joinRepository.findByIdAndWorkspace.mockResolvedValue(joinRequest);
        dateService.create.mockReturnValue(reviewedAt);

        await domain.rejectJoinRequest(
            workspace,
            'reviewer-id',
            'join-id',
            EnumWorkspaceJoinRejectReason.other
        );

        expect(joinRepository.rejectInTx).toHaveBeenCalledWith(
            expect.anything(),
            'join-id',
            'reviewer-id',
            EnumWorkspaceJoinRejectReason.other,
            reviewedAt
        );
        expect(activityLogDomain.stage).toHaveBeenCalledWith({
            action: EnumActivityLogAction.workspaceJoinRejected,
            userId: 'reviewer-id',
            workspaceId: 'workspace-id',
        });
        expect(
            notificationQueue.sendWorkspaceJoinRejected
        ).toHaveBeenCalledWith(
            'requester-id',
            {
                workspaceId: 'workspace-id',
                workspaceName: 'Workspace',
                rejectReasonCode: EnumWorkspaceJoinRejectReason.other,
            },
            'reviewer-id'
        );
    });
});
