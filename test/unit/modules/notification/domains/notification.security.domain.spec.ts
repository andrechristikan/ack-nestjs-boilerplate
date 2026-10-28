import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { Notification } from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNewDeviceLoginPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationSecurityDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    let domain: NotificationSecurityDomain;

    const recipient = TestEncryptedRecipient;
    const noChannelRecipient = { ...recipient, channels: [] };
    const inAppRecipient = {
        ...recipient,
        channels: [EnumNotificationChannel.inApp],
    };
    const emailOnlyRecipient = {
        ...recipient,
        channels: [EnumNotificationChannel.email],
    };
    const noPushRecipient = { ...recipient, encryptedNotificationTokens: [] };

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.high,
        title: 'Security alert',
        body: 'A new device signed in',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const emailPayload = {
        userId: 'user-id',
        encryptedEmail: recipient.encryptedEmail,
        username: recipient.username,
        notificationId: 'n-1',
        cc: [],
        bcc: [],
    };
    const pushPayload = {
        userId: 'user-id',
        notificationId: 'n-1',
        encryptedNotificationTokens: recipient.encryptedNotificationTokens,
        username: recipient.username,
    };
    const allSteps = [
        EnumNotificationStep.createNotification,
        EnumNotificationStep.sendEmail,
        EnumNotificationStep.sendPush,
    ];

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        notificationRepository.createMany.mockResolvedValue([notification]);
        helperDateService.createFromIso.mockImplementation(
            (iso: string) => new Date(iso)
        );
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationSecurityDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: RequestContextService,
                    useValue: requestContextService,
                },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationSecurityDomain);
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.temporaryPasswordByAdmin,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            passwordExpiredAt: new Date(data.passwordExpiredAt),
                        },
                        createdBy: 'admin-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledWith(pushPayload, {
                passwordCreatedAt: data.passwordCreatedAt,
                passwordExpiredAt: data.passwordExpiredAt,
            });
            expect(result).toEqual({
                message: 'notification.queue.temporaryPasswordByAdmin',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendTemporaryPasswordByAdmin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });

        it('skips every step and creates no row when no channel is enabled', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.temporaryPasswordByAdmin,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendTemporaryPasswordByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendTemporaryPasswordByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );
            const emailCalls0: unknown[] = [];
            notificationEmailQueue.sendTemporaryPasswordByAdmin.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendTemporaryPasswordByAdmin.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processTemporaryPasswordByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(pushCalls0).toHaveLength(2);
            expect(pushCalls0[1]).toEqual(pushCalls0[0]);
            expect(second).toEqual(first);
        });
    });

    describe('processChangePassword', () => {
        it('creates the row, enqueues the email, and reports every step completed', async () => {
            const result = await domain.processChangePassword(
                'user-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.changePassword,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendChangePassword
            ).toHaveBeenCalledWith(emailPayload);
            expect(result).toEqual({
                message: 'notification.queue.changePassword',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processChangePassword(
                'user-id',
                noPushRecipient,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendChangePassword
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processChangePassword(
                'user-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect', async () => {
            notificationEmailQueue.sendChangePassword.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processChangePassword(
                'user-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processChangePassword(
                'user-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendChangePassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });

        it('skips every step and creates no row when no channel is enabled', async () => {
            const result = await domain.processChangePassword(
                'user-id',
                noChannelRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendChangePassword
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processChangePassword(
                'user-id',
                inAppRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.changePassword,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendChangePassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );
            const emailCalls0: unknown[] = [];
            notificationEmailQueue.sendChangePassword.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );

            const first = await domain.processChangePassword(
                'user-id',
                recipient,
                'n-1',
                []
            );
            const second = await domain.processChangePassword(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(second).toEqual(first);
        });
    });

    describe('processForgotPassword', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
            expiredInMinutes: 15,
            resendInMinutes: 5,
        };

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processForgotPassword(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.forgotPassword,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendForgotPassword
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendForgotPassword
            ).toHaveBeenCalledWith(pushPayload);
            expect(result).toEqual({
                message: 'notification.queue.forgotPassword',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processForgotPassword(
                'user-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processForgotPassword(
                'user-id',
                recipient,
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendForgotPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processForgotPassword(
                'user-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationPushQueue.sendForgotPassword.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processForgotPassword(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendForgotPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendPush, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processForgotPassword(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });

        it('skips every step and creates no row when no channel is enabled', async () => {
            const result = await domain.processForgotPassword(
                'user-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processForgotPassword(
                'user-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.forgotPassword,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processForgotPassword(
                'user-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendForgotPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendForgotPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );
            const emailCalls0: unknown[] = [];
            notificationEmailQueue.sendForgotPassword.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendForgotPassword.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processForgotPassword(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processForgotPassword(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(pushCalls0).toHaveLength(2);
            expect(pushCalls0[1]).toEqual(pushCalls0[0]);
            expect(second).toEqual(first);
        });
    });

    describe('processResetPassword', () => {
        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processResetPassword(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.resetPassword,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendResetPassword
            ).toHaveBeenCalledWith(emailPayload);
            expect(
                notificationPushQueue.sendResetPassword
            ).toHaveBeenCalledWith(pushPayload);
            expect(result).toEqual({
                message: 'notification.queue.resetPassword',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processResetPassword(
                'user-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processResetPassword(
                'user-id',
                recipient,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processResetPassword(
                'user-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendResetPassword.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processResetPassword(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processResetPassword(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });

        it('skips every step and creates no row when no channel is enabled', async () => {
            const result = await domain.processResetPassword(
                'user-id',
                noChannelRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processResetPassword(
                'user-id',
                inAppRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.resetPassword,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processResetPassword(
                'user-id',
                emailOnlyRecipient,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetPassword
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetPassword
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );
            const emailCalls0: unknown[] = [];
            notificationEmailQueue.sendResetPassword.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendResetPassword.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processResetPassword(
                'user-id',
                recipient,
                'n-1',
                []
            );
            const second = await domain.processResetPassword(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(pushCalls0).toHaveLength(2);
            expect(pushCalls0[1]).toEqual(pushCalls0[0]);
            expect(second).toEqual(first);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                recipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.resetTwoFactorByAdmin,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'admin-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(emailPayload);
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledWith(pushPayload);
            expect(result).toEqual({
                message: 'notification.queue.resetTwoFactorByAdmin',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                recipient,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                noPushRecipient,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendResetTwoFactorByAdmin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                recipient,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                recipient,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });

        it('skips every step and creates no row when no channel is enabled', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                noChannelRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                inAppRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.resetTwoFactorByAdmin,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                emailOnlyRecipient,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendResetTwoFactorByAdmin
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendResetTwoFactorByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );
            const emailCalls0: unknown[] = [];
            notificationEmailQueue.sendResetTwoFactorByAdmin.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendResetTwoFactorByAdmin.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                recipient,
                'n-1',
                []
            );
            const second = await domain.processResetTwoFactorByAdmin(
                'user-id',
                'admin-id',
                recipient,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(pushCalls0).toHaveLength(2);
            expect(pushCalls0[1]).toEqual(pushCalls0[0]);
            expect(second).toEqual(first);
        });
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
        });

        it('resolves device and city, creates the row, then enqueues email and push', async () => {
            const result = await domain.processNewDeviceLogin(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(requestContextService.resolveDevice).toHaveBeenCalledWith(
                requestLog.userAgent
            );
            expect(requestContextService.resolveCity).toHaveBeenCalledWith(
                requestLog.geoLocation
            );
            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.newDeviceLogin,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            loginFrom: data.loginFrom,
                            loginWith: data.loginWith,
                            device: 'Chrome on macOS',
                            city: 'San Francisco',
                            loginAt: new Date(data.loginAt),
                        },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).toHaveBeenCalledWith(pushPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.newDeviceLogin',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processNewDeviceLogin(
                'user-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processNewDeviceLogin(
                'user-id',
                recipient,
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processNewDeviceLogin(
                'user-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendNewDeviceLogin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processNewDeviceLogin(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processNewDeviceLogin(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.createNotification,
                    error: 'mongo',
                },
            ]);
        });

        it('skips every step and creates no row when no channel is enabled', async () => {
            const result = await domain.processNewDeviceLogin(
                'user-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processNewDeviceLogin(
                'user-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.newDeviceLogin,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processNewDeviceLogin(
                'user-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendNewDeviceLogin
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendNewDeviceLogin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );
            const emailCalls0: unknown[] = [];
            notificationEmailQueue.sendNewDeviceLogin.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendNewDeviceLogin.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processNewDeviceLogin(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processNewDeviceLogin(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(pushCalls0).toHaveLength(2);
            expect(pushCalls0[1]).toEqual(pushCalls0[0]);
            expect(second).toEqual(first);
        });
    });
});
