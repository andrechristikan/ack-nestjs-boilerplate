import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';

vi.mock('@common/firebase/services/firebase.service', () => ({
    FirebaseService: class {},
}));

describe('NotificationPushSecurityDomain', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    const service = new NotificationPushSecurityDomain(
        firebaseService,
        notificationRepository,
        messageService,
        helperDateService,
        requestContextService,
        notificationPushQueue
    );
    const payload = mock<INotificationSendPushPayload>({
        userId: 'user-id',
        notificationId: 'notification-id',
        username: 'user',
        notificationTokens: ['token-1'],
    });
    const newDevice = mock<INotificationNewDeviceLoginPayload>({
        loginAt: '2026-01-01T00:00:00.000Z',
        requestLog: {
            userAgent: { ua: 'browser' },
            geoLocation: null,
            ipAddress: '127.0.0.1',
        },
    });
    const temporary = mock<INotificationTemporaryPasswordPushPayload>({
        passwordExpiredAt: '2026-02-01T00:00:00.000Z',
    });
    const cases = [
        ['new login', () => service.processNewDeviceLogin(payload, newDevice)],
        [
            'reset two-factor',
            () => service.processResetTwoFactorByAdmin(payload),
        ],
        [
            'temporary password',
            () => service.processTemporaryPasswordByAdmin(payload, temporary),
        ],
        ['reset password', () => service.processResetPassword(payload)],
        ['forgot password', () => service.processForgotPassword(payload)],
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
        helperDateService.createFromIso.mockReturnValue(
            new Date('2026-01-01T00:00:00.000Z')
        );
        helperDateService.formatToRFC2822.mockReturnValue(
            'Thu, 01 Jan 2026 00:00:00 GMT'
        );
        requestContextService.resolveDevice.mockReturnValue('Browser');
        requestContextService.resolveCity.mockReturnValue('Rome');
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
});
