import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    buildPushNotification,
    expectPushAllStepsSkipped,
    expectPushFailureTokensMerged,
    expectPushOutagePending,
    expectPushRetrySendsPending,
    expectPushRetrySkipsSend,
    expectPushSendFailure,
    expectPushSentAtFailure,
    expectPushSentWithCleanup,
    PushAllSteps,
    PushRecordedSteps,
} from '@test/unit/helpers/test.unit.notification-push.helper';
import type { INotificationPushDoubles } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationPushWorkspaceDomain', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    let domain: NotificationPushWorkspaceDomain;

    const send: INotificationSendPushPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        notificationTokens: ['token-1', 'token-2'],
        username: 'nadia',
    };
    const notification = buildPushNotification();
    const partialFailure = {
        failureTokens: ['bad'],
        retryTokens: [],
        successCount: 1,
        failureCount: 1,
    };
    const fullSuccess = {
        failureTokens: [],
        retryTokens: [],
        successCount: 2,
        failureCount: 0,
    };
    const totalOutage = {
        failureTokens: [],
        retryTokens: ['t1', 't2'],
        successCount: 0,
        failureCount: 2,
    };
    const recorded = PushRecordedSteps;
    const doubles: INotificationPushDoubles = {
        firebaseService,
        notificationRepository,
        notificationPushQueue,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushWorkspaceDomain,
                NotificationUtil,
                { provide: FirebaseService, useValue: firebaseService },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: MessageService, useValue: messageService },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationPushWorkspaceDomain);
        firebaseService.isInitialized.mockReturnValue(true);
        notificationRepository.updateProcessAt.mockResolvedValue(notification);
    });

    describe('processWorkspaceInvite', () => {
        const data: INotificationWorkspaceInvitePushPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Omar',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };

        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Workspace invite')
                .mockReturnValueOnce('Omar invited you to Acme');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [],
                null,
                ['t1']
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace invite notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
                pendingTokens: ['t1'],
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [],
                null,
                null
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                {
                    properties: {
                        username: send.username,
                        workspaceName: data.workspaceName,
                        inviterName: data.inviterName,
                    },
                }
            );
            expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
                send.notificationTokens,
                { title: 'Workspace invite', body: 'Omar invited you to Acme' }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Workspace invite notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceInvite(
                send,
                data,
                recorded,
                ['bad'],
                null
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processWorkspaceInvite(
                send,
                data,
                PushAllSteps,
                null,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSendFailure(doubles, result);
        });

        it('fails the multicast step and records every retry token as pending on a total outage', async () => {
            firebaseService.sendMulticast.mockResolvedValue(totalOutage);

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [],
                null,
                null
            );

            expectPushOutagePending(doubles, result);
        });

        it('sends a retry only to the pending tokens and merges the recorded failure tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['bad'],
                ['t2']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['old', 'bad'],
                ['t2']
            );

            expectPushFailureTokensMerged(doubles, send, result);
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        const data: INotificationWorkspaceJoinRequestPushPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
        };

        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Join request')
                .mockReturnValueOnce('Omar requested to join Acme');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [],
                null,
                ['t1']
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace join request notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
                pendingTokens: ['t1'],
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [],
                null,
                null
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                {
                    properties: {
                        username: send.username,
                        workspaceName: data.workspaceName,
                        requesterName: data.requesterName,
                    },
                }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Workspace join request notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                recorded,
                ['bad'],
                null
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                PushAllSteps,
                null,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSendFailure(doubles, result);
        });

        it('fails the multicast step and records every retry token as pending on a total outage', async () => {
            firebaseService.sendMulticast.mockResolvedValue(totalOutage);

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [],
                null,
                null
            );

            expectPushOutagePending(doubles, result);
        });

        it('sends a retry only to the pending tokens and merges the recorded failure tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['bad'],
                ['t2']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['old', 'bad'],
                ['t2']
            );

            expectPushFailureTokensMerged(doubles, send, result);
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        const data: INotificationWorkspaceJoinAcceptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
        };

        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Join accepted')
                .mockReturnValueOnce('You joined Acme');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [],
                null,
                ['t1']
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace join accepted notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
                pendingTokens: ['t1'],
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [],
                null,
                null
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                {
                    properties: {
                        username: send.username,
                        workspaceName: data.workspaceName,
                    },
                }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Workspace join accepted notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                recorded,
                ['bad'],
                null
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                PushAllSteps,
                null,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSendFailure(doubles, result);
        });

        it('fails the multicast step and records every retry token as pending on a total outage', async () => {
            firebaseService.sendMulticast.mockResolvedValue(totalOutage);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [],
                null,
                null
            );

            expectPushOutagePending(doubles, result);
        });

        it('sends a retry only to the pending tokens and merges the recorded failure tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['bad'],
                ['t2']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['old', 'bad'],
                ['t2']
            );

            expectPushFailureTokensMerged(doubles, send, result);
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        const data: INotificationWorkspaceJoinRejectedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };

        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Workspace is full')
                .mockReturnValueOnce('Join rejected')
                .mockReturnValueOnce('Your request to join Acme was rejected');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [],
                null,
                ['t1']
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace join rejected notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
                pendingTokens: ['t1'],
            });
        });

        it('resolves the reject reason label, then sends, cleans up and stamps sentAt', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [],
                null,
                null
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                1,
                `notification.rejectReason.${data.rejectReasonCode}`
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                3,
                'body',
                {
                    properties: {
                        username: send.username,
                        workspaceName: data.workspaceName,
                        rejectReasonLabel: 'Workspace is full',
                    },
                }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Workspace join rejected notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                recorded,
                ['bad'],
                null
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                PushAllSteps,
                null,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [],
                null,
                null
            );

            expectPushSendFailure(doubles, result);
        });

        it('fails the multicast step and records every retry token as pending on a total outage', async () => {
            firebaseService.sendMulticast.mockResolvedValue(totalOutage);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [],
                null,
                null
            );

            expectPushOutagePending(doubles, result);
        });

        it('sends a retry only to the pending tokens and merges the recorded failure tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['bad'],
                ['t2']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['old', 'bad'],
                ['t2']
            );

            expectPushFailureTokensMerged(doubles, send, result);
        });
    });
});
