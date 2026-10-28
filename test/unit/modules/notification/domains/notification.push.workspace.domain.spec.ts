import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumNotificationChannel,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationSendPushEncryptedPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
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
    stubCipherDecryption,
} from '@test/unit/helpers/test.unit.notification-push.helper';
import type { INotificationPushDoubles } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationPushWorkspaceDomain', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    let domain: NotificationPushWorkspaceDomain;

    const send: INotificationSendPushEncryptedPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedNotificationTokens: ['cipher(token-1)', 'cipher(token-2)'],
        username: 'nadia',
    };
    const partialFailure = {
        failureTokens: ['token-1'],
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
        retryTokens: ['token-1', 'token-2'],
        successCount: 0,
        failureCount: 2,
    };
    const recorded = PushRecordedSteps;
    const doubles: INotificationPushDoubles = {
        firebaseService,
        notificationRepository,
        notificationPushQueue,
        helperEncryptionService,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockReturnValue('secret-key');
        stubCipherDecryption(helperEncryptionService);
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
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(NotificationPushWorkspaceDomain);
        firebaseService.isInitialized.mockReturnValue(true);
        notificationRepository.updateProcessAt.mockResolvedValue();
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
            messageService.setMessage.mockImplementation((path: string) =>
                path.endsWith('.title')
                    ? 'Workspace invite'
                    : path.endsWith('.body')
                      ? 'Omar invited you to Acme'
                      : path
            );
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
                message: 'notification.queue.push.error.firebaseNotInitialized',
                completedSteps: [],
                failedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: ['t1'],
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

            expect(
                notificationRepository.updateProcessAt
            ).toHaveBeenCalledTimes(1);
            expect(notificationRepository.updateProcessAt).toHaveBeenCalledWith(
                send.userId,
                send.notificationId,
                EnumNotificationChannel.push
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceInvite.body,
                {
                    properties: {
                        username: send.username,
                        workspaceName: data.workspaceName,
                        inviterName: data.inviterName,
                    },
                }
            );
            expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
                ['token-1', 'token-2'],
                { title: 'Workspace invite', body: 'Omar invited you to Acme' }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'notification.queue.push.workspaceInvite'
            );
        });

        it('rethrows a token decryption failure without calling Firebase', async () => {
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw new HelperDecryptFailedException();
            });

            await expect(
                domain.processWorkspaceInvite(
                    send,
                    data,
                    [EnumNotificationStep.updateProcessAt],
                    null,
                    null
                )
            ).rejects.toBeInstanceOf(HelperDecryptFailedException);
            expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
        });

        it('skips updateProcessAt and builds the message from the kind contract when the step is recorded', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            await domain.processWorkspaceInvite(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null,
                null
            );

            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                1,
                NotificationKindContract.workspaceInvite.title
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceInvite.body,
                expect.any(Object)
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceInvite(
                send,
                data,
                recorded,
                ['cipher(token-1)'],
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
                ['cipher(token-1)'],
                ['cipher(token-2)']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceInvite(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['cipher(old)', 'cipher(token-1)'],
                ['cipher(token-1)', 'cipher(token-2)']
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
            messageService.setMessage.mockImplementation((path: string) =>
                path.endsWith('.title')
                    ? 'Join request'
                    : path.endsWith('.body')
                      ? 'Omar requested to join Acme'
                      : path
            );
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
                message: 'notification.queue.push.error.firebaseNotInitialized',
                completedSteps: [],
                failedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: ['t1'],
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

            expect(
                notificationRepository.updateProcessAt
            ).toHaveBeenCalledTimes(1);
            expect(notificationRepository.updateProcessAt).toHaveBeenCalledWith(
                send.userId,
                send.notificationId,
                EnumNotificationChannel.push
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceJoinRequest.body,
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
                'notification.queue.push.workspaceJoinRequest'
            );
        });

        it('skips updateProcessAt and builds the message from the kind contract when the step is recorded', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            await domain.processWorkspaceJoinRequest(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null,
                null
            );

            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                1,
                NotificationKindContract.workspaceJoinRequest.title
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceJoinRequest.body,
                expect.any(Object)
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                recorded,
                ['cipher(token-1)'],
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
                ['cipher(token-1)'],
                ['cipher(token-2)']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinRequest(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['cipher(old)', 'cipher(token-1)'],
                ['cipher(token-1)', 'cipher(token-2)']
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
            messageService.setMessage.mockImplementation((path: string) =>
                path.endsWith('.title')
                    ? 'Join accepted'
                    : path.endsWith('.body')
                      ? 'You joined Acme'
                      : path
            );
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
                message: 'notification.queue.push.error.firebaseNotInitialized',
                completedSteps: [],
                failedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: ['t1'],
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

            expect(
                notificationRepository.updateProcessAt
            ).toHaveBeenCalledTimes(1);
            expect(notificationRepository.updateProcessAt).toHaveBeenCalledWith(
                send.userId,
                send.notificationId,
                EnumNotificationChannel.push
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceJoinAccepted.body,
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
                'notification.queue.push.workspaceJoinAccepted'
            );
        });

        it('skips updateProcessAt and builds the message from the kind contract when the step is recorded', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null,
                null
            );

            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                1,
                NotificationKindContract.workspaceJoinAccepted.title
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceJoinAccepted.body,
                expect.any(Object)
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                recorded,
                ['cipher(token-1)'],
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
                ['cipher(token-1)'],
                ['cipher(token-2)']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['cipher(old)', 'cipher(token-1)'],
                ['cipher(token-1)', 'cipher(token-2)']
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
            messageService.setMessage.mockImplementation((path: string) =>
                path.startsWith('notification.rejectReason')
                    ? 'Workspace is full'
                    : path.endsWith('.title')
                      ? 'Join rejected'
                      : path.endsWith('.body')
                        ? 'Your request to join Acme was rejected'
                        : path
            );
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
                message: 'notification.queue.push.error.firebaseNotInitialized',
                completedSteps: [],
                failedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: ['t1'],
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

            expect(
                notificationRepository.updateProcessAt
            ).toHaveBeenCalledTimes(1);
            expect(notificationRepository.updateProcessAt).toHaveBeenCalledWith(
                send.userId,
                send.notificationId,
                EnumNotificationChannel.push
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                1,
                `notification.rejectReason.${data.rejectReasonCode}`
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                3,
                NotificationKindContract.workspaceJoinRejected.body,
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
                'notification.queue.push.workspaceJoinRejected'
            );
        });

        it('skips updateProcessAt and builds the message from the kind contract when the step is recorded', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);

            await domain.processWorkspaceJoinRejected(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                null,
                null
            );

            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                NotificationKindContract.workspaceJoinRejected.title
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                3,
                NotificationKindContract.workspaceJoinRejected.body,
                expect.any(Object)
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                recorded,
                ['cipher(token-1)'],
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
                ['cipher(token-1)'],
                ['cipher(token-2)']
            );

            expectPushRetrySendsPending(doubles, send, result);
        });

        it('deduplicates the failure tokens merged across attempts', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['cipher(old)', 'cipher(token-1)'],
                ['cipher(token-1)', 'cipher(token-2)']
            );

            expectPushFailureTokensMerged(doubles, send, result);
        });
    });
});
