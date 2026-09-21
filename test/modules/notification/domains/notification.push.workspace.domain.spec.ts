import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
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

vi.mock('@common/firebase/services/firebase.service', () => ({
    FirebaseService: class {},
}));

describe('NotificationPushWorkspaceDomain', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const service = new NotificationPushWorkspaceDomain(
        firebaseService,
        notificationRepository,
        messageService,
        notificationPushQueue
    );
    const payload = mock<INotificationSendPushPayload>({
        userId: 'user-id',
        notificationId: 'notification-id',
        username: 'user',
        notificationTokens: ['token-1'],
    });
    const invite = mock<INotificationWorkspaceInvitePushPayload>({
        workspaceName: 'Workspace',
        inviterName: 'Inviter',
    });
    const request = mock<INotificationWorkspaceJoinRequestPushPayload>({
        workspaceName: 'Workspace',
        requesterName: 'Requester',
    });
    const accepted = mock<INotificationWorkspaceJoinAcceptedPayload>({
        workspaceName: 'Workspace',
    });
    const rejected = mock<INotificationWorkspaceJoinRejectedPayload>({
        workspaceName: 'Workspace',
        rejectReasonCode: 'other',
    });
    const cases = [
        [
            'workspace invite',
            () => service.processWorkspaceInvite(payload, invite),
        ],
        [
            'workspace join request',
            () => service.processWorkspaceJoinRequest(payload, request),
        ],
        [
            'workspace join accepted',
            () => service.processWorkspaceJoinAccepted(payload, accepted),
        ],
        [
            'workspace join rejected',
            () => service.processWorkspaceJoinRejected(payload, rejected),
        ],
    ] as const;

    beforeEach(() => {
        firebaseService.isInitialized.mockReturnValue(true);
        notificationRepository.updateProcessAt.mockResolvedValue(
            mock({ title: 'notification.title', body: 'notification.body' })
        );
        messageService.setMessage
            .mockReturnValueOnce('Title')
            .mockReturnValue('Body');
        firebaseService.sendMulticast.mockResolvedValue({
            successCount: 1,
            failureCount: 0,
            failureTokens: [],
        });
    });

    it.each(cases)(
        'skips %s when Firebase is unavailable',
        async (_name, process) => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await process();

            expect(result.message).toContain('Firebase not initialized');
            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
        }
    );

    it.each(cases)(
        'skips %s when persistence cannot claim the notification',
        async (_name, process) => {
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await process();

            expect(result.message).toContain('Notification not found');
            expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
        }
    );

    it.each(cases)(
        'sends %s and records failed provider tokens',
        async (_name, process) => {
            firebaseService.sendMulticast.mockResolvedValue({
                successCount: 0,
                failureCount: 1,
                failureTokens: ['bad-token'],
            });

            const result = await process();

            expect(result.message).toContain('processed');
            expect(
                notificationPushQueue.sendCleanupTokens
            ).toHaveBeenCalledWith(payload.userId, ['bad-token']);
            expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
                payload.userId,
                payload.notificationId,
                'push',
                ['bad-token']
            );
        }
    );

    it('localizes the workspace rejection reason', async () => {
        await service.processWorkspaceJoinRejected(payload, rejected);

        expect(messageService.setMessage).toHaveBeenCalledWith(
            'notification.rejectReason.other'
        );
    });
});
