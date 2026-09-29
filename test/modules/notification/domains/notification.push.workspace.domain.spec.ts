import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumNotificationChannel,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import type {
    INotificationSendPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';

describe('NotificationPushWorkspaceDomain', () => {
    const firebaseService = mock<FirebaseService>();
    const notificationRepository = mock<NotificationRepository>();
    const messageService = mock<MessageService>();
    const notificationPushQueue = mock<NotificationPushQueue>();
    let domain: NotificationPushWorkspaceDomain;

    const send: INotificationSendPushPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        notificationTokens: ['token-1', 'token-2'],
        username: 'nadia',
    };
    const pushResult = {
        failureTokens: ['token-2'],
        successCount: 1,
        failureCount: 1,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushWorkspaceDomain,
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

        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceInvite(send, data);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace invite notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processWorkspaceInvite(send, data);

            expect(result).toEqual({
                message:
                    'Notification not found, skipping workspace invite notification',
            });
        });

        it('sends the push, cleans up failed tokens, and marks the notification sent', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Workspace invite')
                .mockReturnValueOnce('Omar invited you to Acme');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processWorkspaceInvite(send, data);

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
            expect(
                notificationPushQueue.sendCleanupTokens
            ).toHaveBeenCalledWith(send.userId, pushResult.failureTokens);
            expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
                send.userId,
                send.notificationId,
                EnumNotificationChannel.push,
                pushResult.failureTokens
            );
            expect(result).toEqual({
                message: 'Workspace invite notification processed',
                result: pushResult,
            });
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        const data: INotificationWorkspaceJoinRequestPushPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
        };

        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceJoinRequest(send, data);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace join request notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processWorkspaceJoinRequest(send, data);

            expect(result).toEqual({
                message:
                    'Notification not found, skipping workspace join request notification',
            });
        });

        it('sends the push and reports the result', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Join request')
                .mockReturnValueOnce('Omar requested to join Acme');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processWorkspaceJoinRequest(send, data);

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
            expect(result).toEqual({
                message: 'Workspace join request notification processed',
                result: pushResult,
            });
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        const data: INotificationWorkspaceJoinAcceptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
        };

        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace join accepted notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data
            );

            expect(result).toEqual({
                message:
                    'Notification not found, skipping workspace join accepted notification',
            });
        });

        it('sends the push and reports the result', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Join accepted')
                .mockReturnValueOnce('You joined Acme');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processWorkspaceJoinAccepted(
                send,
                data
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
            expect(result).toEqual({
                message: 'Workspace join accepted notification processed',
                result: pushResult,
            });
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        const data: INotificationWorkspaceJoinRejectedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };

        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping workspace join rejected notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data
            );

            expect(result).toEqual({
                message:
                    'Notification not found, skipping workspace join rejected notification',
            });
        });

        it('resolves the reject reason label and sends the push', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Workspace is full')
                .mockReturnValueOnce('Join rejected')
                .mockReturnValueOnce('Your request to join Acme was rejected');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processWorkspaceJoinRejected(
                send,
                data
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
            expect(result).toEqual({
                message: 'Workspace join rejected notification processed',
                result: pushResult,
            });
        });
    });
});
