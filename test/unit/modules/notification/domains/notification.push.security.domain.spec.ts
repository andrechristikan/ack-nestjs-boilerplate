import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    buildPushNotification,
    expectPushAllStepsSkipped,
    expectPushRetrySkipsSend,
    expectPushSendFailure,
    expectPushSentAtFailure,
    expectPushSentWithCleanup,
    PushAllSteps,
    PushRecordedSteps,
} from '@test/unit/helpers/test.unit.notification-push.helper';
import type { INotificationPushDoubles } from '@test/unit/helpers/test.unit.notification-push.helper';

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
    let domain: NotificationPushSecurityDomain;

    const send: INotificationSendPushPayload = {
        userId: 'user-id',
        notificationId: 'notification-id',
        notificationTokens: ['token-1', 'token-2'],
        username: 'nadia',
    };
    const notification = buildPushNotification();
    const partialFailure = {
        failureTokens: ['bad'],
        successCount: 1,
        failureCount: 1,
    };
    const fullSuccess = {
        failureTokens: [],
        successCount: 2,
        failureCount: 0,
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
                NotificationPushSecurityDomain,
                NotificationUtil,
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
        firebaseService.isInitialized.mockReturnValue(true);
        notificationRepository.updateProcessAt.mockResolvedValue(notification);
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

        beforeEach(() => {
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
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processNewDeviceLogin(
                send,
                data,
                [EnumNotificationStep.updateProcessAt],
                ['bad']
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping new login notification',
                completedSteps: [EnumNotificationStep.updateProcessAt],
                failedSteps: [],
                failureTokens: ['bad'],
            });
            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processNewDeviceLogin(
                send,
                data,
                [],
                null
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
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
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'New login notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processNewDeviceLogin(
                send,
                data,
                recorded,
                ['bad']
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processNewDeviceLogin(
                send,
                data,
                PushAllSteps,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processNewDeviceLogin(
                send,
                data,
                [],
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processNewDeviceLogin(
                send,
                data,
                [],
                null
            );

            expectPushSendFailure(doubles, result);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Two-factor reset')
                .mockReturnValueOnce('Your two-factor was reset');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processResetTwoFactorByAdmin(
                send,
                [],
                null
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping reset two-factor notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processResetTwoFactorByAdmin(
                send,
                [],
                null
            );

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                { properties: { username: send.username } }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Reset two-factor notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                send,
                recorded,
                ['bad']
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                send,
                PushAllSteps,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processResetTwoFactorByAdmin(
                send,
                [],
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processResetTwoFactorByAdmin(
                send,
                [],
                null
            );

            expectPushSendFailure(doubles, result);
        });
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const data: INotificationTemporaryPasswordPushPayload = {
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        beforeEach(() => {
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            messageService.setMessage
                .mockReturnValueOnce('Temporary password')
                .mockReturnValueOnce('Your temporary password expires soon');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data,
                [],
                null
            );

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping temporary password notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data,
                [],
                null
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
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Temporary password notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data,
                recorded,
                ['bad']
            );

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data,
                PushAllSteps,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data,
                [],
                null
            );

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processTemporaryPasswordByAdmin(
                send,
                data,
                [],
                null
            );

            expectPushSendFailure(doubles, result);
        });
    });

    describe('processResetPassword', () => {
        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Reset password')
                .mockReturnValueOnce('Your password was reset');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processResetPassword(send, [], null);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping reset password notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processResetPassword(send, [], null);

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                { properties: { username: send.username } }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Reset password notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processResetPassword(send, recorded, [
                'bad',
            ]);

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processResetPassword(
                send,
                PushAllSteps,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processResetPassword(send, [], null);

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processResetPassword(send, [], null);

            expectPushSendFailure(doubles, result);
        });
    });

    describe('processForgotPassword', () => {
        beforeEach(() => {
            messageService.setMessage
                .mockReturnValueOnce('Forgot password')
                .mockReturnValueOnce('You requested a password reset');
        });

        it('returns the progress as passed when Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await domain.processForgotPassword(send, [], null);

            expect(result).toEqual({
                message:
                    'Firebase not initialized, skipping forgot password notification',
                completedSteps: [],
                failedSteps: [],
                failureTokens: null,
            });
        });

        it('sends, then cleans up and stamps sentAt with the failed tokens', async () => {
            firebaseService.sendMulticast.mockResolvedValue(partialFailure);

            const result = await domain.processForgotPassword(send, [], null);

            expect(messageService.setMessage).toHaveBeenNthCalledWith(
                2,
                'body',
                { properties: { username: send.username } }
            );
            expectPushSentWithCleanup(
                doubles,
                send,
                result,
                'Forgot password notification processed'
            );
        });

        it('does not push again and reuses the recorded tokens on a retry after a failed updateSentAt', async () => {
            const result = await domain.processForgotPassword(send, recorded, [
                'bad',
            ]);

            expectPushRetrySkipsSend(doubles, send, result);
        });

        it('runs no step and returns the recorded steps on a retry with every step recorded', async () => {
            const result = await domain.processForgotPassword(
                send,
                PushAllSteps,
                null
            );

            expectPushAllStepsSkipped(doubles, result);
        });

        it('names a rejected updateSentAt and still runs the cleanup', async () => {
            firebaseService.sendMulticast.mockResolvedValue(fullSuccess);
            notificationRepository.updateSentAt.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processForgotPassword(send, [], null);

            expectPushSentAtFailure(doubles, result);
        });

        it('names a thrown sendMulticast and runs neither cleanup nor sentAt', async () => {
            firebaseService.sendMulticast.mockRejectedValue(new Error('fcm'));

            const result = await domain.processForgotPassword(send, [], null);

            expectPushSendFailure(doubles, result);
        });
    });
});
