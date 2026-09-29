import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumNotificationChannel,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';

describe('NotificationPushSecurityDomain', () => {
    const firebaseService = mock<FirebaseService>();
    const notificationRepository = mock<NotificationRepository>();
    const messageService = mock<MessageService>();
    const helperDateService = mock<HelperDateService>();
    const requestContextService = mock<RequestContextService>();
    const notificationPushQueue = mock<NotificationPushQueue>();
    let domain: NotificationPushSecurityDomain;

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
                NotificationPushSecurityDomain,
                { provide: FirebaseService, useValue: firebaseService },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: MessageService, useValue: messageService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: RequestContextService,
                    useValue: requestContextService,
                },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationPushSecurityDomain);
    });

    describe('processNewDeviceLogin', () => {
        const requestLog: IRequestLog = {
            userAgent: {
                ua: 'Mozilla/5.0',
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '203.0.113.5',
            geoLocation: {
                latitude: 1,
                longitude: 2,
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
            },
        };
        const data: INotificationNewDeviceLoginPayload = {
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            loginAt: '2024-01-01T00:00:00.000Z',
            requestLog,
        };

        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processNewDeviceLogin(send, data);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping new login notification',
            });
            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processNewDeviceLogin(send, data);

            expect(result).toEqual({
                message:
                    'Notification not found, skipping new login notification',
            });
            expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
        });

        it('sends the push, cleans up failed tokens, and marks the notification sent', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'notification.title.newDeviceLogin',
                body: 'notification.body.newDeviceLogin',
            });
            requestContextService.resolveDevice.mockReturnValue(
                'Chrome on macOS'
            );
            requestContextService.resolveCity.mockReturnValue('San Francisco');
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            messageService.setMessage
                .mockReturnValueOnce('New login')
                .mockReturnValueOnce('New login from Chrome on macOS');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processNewDeviceLogin(send, data);

            expect(requestContextService.resolveDevice).toHaveBeenCalledWith(
                requestLog.userAgent
            );
            expect(requestContextService.resolveCity).toHaveBeenCalledWith(
                requestLog.geoLocation
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                1,
                'notification.title.newDeviceLogin'
            );
            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'notification.body.newDeviceLogin',
                {
                    properties: {
                        device: 'Chrome on macOS',
                        city: 'San Francisco',
                        username: send.username,
                        loginAt: data.loginAt,
                    },
                }
            );
            expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
                send.notificationTokens,
                { title: 'New login', body: 'New login from Chrome on macOS' }
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
                message: 'New login notification processed',
                result: pushResult,
            });
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processResetTwoFactorByAdmin(send);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping reset two-factor notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processResetTwoFactorByAdmin(send);

            expect(result).toEqual({
                message:
                    'Notification not found, skipping reset two-factor notification',
            });
        });

        it('sends the push and reports the result', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Two-factor reset')
                .mockReturnValueOnce('Your two-factor was reset');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processResetTwoFactorByAdmin(send);

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                {
                    properties: { username: send.username },
                }
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
                message: 'Reset two-factor notification processed',
                result: pushResult,
            });
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const data: INotificationTemporaryPasswordPushPayload = {
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping temporary password notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data
            );

            expect(result).toEqual({
                message:
                    'Notification not found, skipping temporary password notification',
            });
        });

        it('formats the expiry date and sends the push', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            messageService.setMessage
                .mockReturnValueOnce('Temporary password')
                .mockReturnValueOnce('Your temporary password expires soon');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                {
                    properties: {
                        username: send.username,
                        passwordExpiredAt: data.passwordExpiredAt,
                    },
                }
            );
            expect(result).toEqual({
                message: 'Temporary password notification processed',
                result: pushResult,
            });
        });
    });

    describe('processResetPassword', () => {
        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processResetPassword(send);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping reset password notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processResetPassword(send);

            expect(result).toEqual({
                message:
                    'Notification not found, skipping reset password notification',
            });
        });

        it('sends the push and reports the result', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Reset password')
                .mockReturnValueOnce('Your password was reset');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processResetPassword(send);

            expect(result).toEqual({
                message: 'Reset password notification processed',
                result: pushResult,
            });
        });
    });

    describe('processForgotPassword', () => {
        it('skips when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processForgotPassword(send);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping forgot password notification',
            });
        });

        it('skips when the notification row is missing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result = await domain.processForgotPassword(send);

            expect(result).toEqual({
                message:
                    'Notification not found, skipping forgot password notification',
            });
        });

        it('sends the push and reports the result', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            notificationRepository.updateProcessAt.mockResolvedValue({
                title: 'title',
                body: 'body',
            });
            messageService.setMessage
                .mockReturnValueOnce('Forgot password')
                .mockReturnValueOnce('You requested a password reset');
            firebaseService.sendMulticast.mockResolvedValue(pushResult);

            const result = await domain.processForgotPassword(send);

            expect(result).toEqual({
                message: 'Forgot password notification processed',
                result: pushResult,
            });
        });
    });
});
