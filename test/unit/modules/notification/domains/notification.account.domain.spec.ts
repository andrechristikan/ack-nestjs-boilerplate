import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { Notification } from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationAccountDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    let domain: NotificationAccountDomain;

    const recipient = TestEncryptedRecipient;
    const noChannelRecipient = { ...recipient, channels: [] };
    const inAppRecipient = {
        ...recipient,
        channels: [EnumNotificationChannel.inApp],
    };

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'Welcome',
        body: 'Welcome to the platform',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'admin-id',
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

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        notificationRepository.createMany.mockResolvedValue([notification]);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationAccountDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationAccountDomain);
    });

    describe('processWelcomeByAdmin', () => {
        const data = {
            encryptedPassword: 'cipher',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcomeByAdmin,
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
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.welcomeByAdmin',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            const result = await domain.processWelcomeByAdmin(
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
                notificationEmailQueue.sendWelcomeByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.welcomeByAdmin',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            notificationEmailQueue.sendWelcomeByAdmin.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
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

            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWelcomeByAdmin
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
            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcomeByAdmin,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendWelcomeByAdmin
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
            notificationEmailQueue.sendWelcomeByAdmin.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );

            const first = await domain.processWelcomeByAdmin(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processWelcomeByAdmin(
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
            expect(second).toEqual(first);
        });
    });

    describe('processWelcome', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            expiredInMinutes: 30,
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
        };
        const verificationEmailPayload = {
            ...emailPayload,
            notificationId: 'n-2',
        };
        const allSteps = [
            EnumNotificationStep.createNotification,
            EnumNotificationStep.sendWelcomeEmail,
            EnumNotificationStep.sendVerificationEmail,
        ];
        const verificationChannels = [
            ...NotificationKindContract.verificationEmail.pendingChannels,
            ...NotificationKindContract.verificationEmail.deliveredChannels,
        ];

        it('creates both rows in one call, then enqueues both emails, and reports every step completed', async () => {
            const result = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledTimes(1);
            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcome,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: 'n-2',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: verificationChannels,
                    },
                },
            ]);
            expect(notificationEmailQueue.sendWelcome).toHaveBeenCalledWith(
                emailPayload
            );
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(verificationEmailPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.welcome',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendWelcomeEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('skips the verification email when its step is already recorded', async () => {
            const result = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                allSteps
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([
                notification,
                notification,
            ]);

            const result = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('names a rejected side effect and still runs the other', async () => {
            notificationEmailQueue.sendWelcome.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendWelcomeEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendVerificationEmail,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
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

        it('still creates the verification row and sends the verification email when no channel is enabled', async () => {
            const result = await domain.processWelcome(
                'user-id',
                noChannelRecipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: 'n-2',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: verificationChannels,
                    },
                },
            ]);
            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(verificationEmailPayload, data);
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendVerificationEmail,
            ]);
        });

        it('creates the welcome row with the remaining channels, skips the welcome email, and still sends the verification email without the email channel', async () => {
            const result = await domain.processWelcome(
                'user-id',
                inAppRecipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcome,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: [EnumNotificationChannel.inApp],
                    },
                },
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: 'n-2',
                        userId: 'user-id',
                        metadata: { username: recipient.username },
                        createdBy: 'user-id',
                        channels: verificationChannels,
                    },
                },
            ]);
            expect(notificationEmailQueue.sendWelcome).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendVerificationEmail,
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
            notificationEmailQueue.sendWelcome.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const emailCalls1: unknown[] = [];
            notificationEmailQueue.sendVerificationEmail.mockImplementation(
                async (...args) => {
                    emailCalls1.push(args);
                }
            );

            const first = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                []
            );
            const second = await domain.processWelcome(
                'user-id',
                recipient,
                data,
                'n-1',
                'n-2',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(emailCalls0).toHaveLength(2);
            expect(emailCalls0[1]).toEqual(emailCalls0[0]);
            expect(emailCalls1).toHaveLength(2);
            expect(emailCalls1[1]).toEqual(emailCalls1[0]);
            expect(second).toEqual(first);
        });
    });

    describe('processWelcomeSocial', () => {
        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            const result = await domain.processWelcomeSocial(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcomeSocial,
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
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledWith(emailPayload);
            expect(result).toEqual({
                message: 'notification.queue.welcomeSocial',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            const result = await domain.processWelcomeSocial(
                'user-id',
                recipient,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            const result = await domain.processWelcomeSocial(
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
                notificationEmailQueue.sendWelcomeSocial
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.welcomeSocial',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWelcomeSocial(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            notificationEmailQueue.sendWelcomeSocial.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWelcomeSocial(
                'user-id',
                recipient,
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

            const result = await domain.processWelcomeSocial(
                'user-id',
                recipient,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWelcomeSocial
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
            const result = await domain.processWelcomeSocial(
                'user-id',
                noChannelRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWelcomeSocial
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processWelcomeSocial(
                'user-id',
                inAppRecipient,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.welcomeSocial,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendWelcomeSocial
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
            notificationEmailQueue.sendWelcomeSocial.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );

            const first = await domain.processWelcomeSocial(
                'user-id',
                recipient,
                'n-1',
                []
            );
            const second = await domain.processWelcomeSocial(
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

    describe('processVerifiedEmail', () => {
        const data = { reference: 'ref-1' };

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            const result = await domain.processVerifiedEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verifiedEmail,
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
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.verifiedEmail',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            const result = await domain.processVerifiedEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            const result = await domain.processVerifiedEmail(
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
                notificationEmailQueue.sendVerifiedEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.verifiedEmail',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processVerifiedEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            notificationEmailQueue.sendVerifiedEmail.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processVerifiedEmail(
                'user-id',
                recipient,
                data,
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

            const result = await domain.processVerifiedEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendVerifiedEmail
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
            const result = await domain.processVerifiedEmail(
                'user-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processVerifiedEmail(
                'user-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verifiedEmail,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendVerifiedEmail
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
            notificationEmailQueue.sendVerifiedEmail.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );

            const first = await domain.processVerifiedEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processVerifiedEmail(
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
            expect(second).toEqual(first);
        });
    });

    describe('processVerificationEmail', () => {
        const data = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            expiredInMinutes: 30,
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
        };

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            const result = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verificationEmail,
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
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.verificationEmail',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendVerificationEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            const result = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendVerificationEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            const result = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendVerificationEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.verificationEmail',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendVerificationEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            notificationEmailQueue.sendVerificationEmail.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([
                {
                    step: EnumNotificationStep.sendVerificationEmail,
                    error: 'redis',
                },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendVerificationEmail
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
            const result = await domain.processVerificationEmail(
                'user-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processVerificationEmail(
                'user-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendVerificationEmail
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
            notificationEmailQueue.sendVerificationEmail.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );

            const first = await domain.processVerificationEmail(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processVerificationEmail(
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
            expect(second).toEqual(first);
        });
    });

    describe('processVerifiedMobileNumber', () => {
        const data = {
            reference: 'ref-1',
            resendInMinutes: 5,
            mobileNumber: '+15551234567',
        };

        beforeEach(() => {
            helperStringService.censor.mockReturnValue('+1555****567');
        });

        it('creates the row, then enqueues the email, and reports every step completed', async () => {
            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verifiedMobileNumber,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            mobileNumber: '+1555****567',
                        },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.verifiedMobileNumber',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('skips the create on a retry and enqueues the email', async () => {
            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                recipient,
                data,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips every completed step on a retry', async () => {
            const result = await domain.processVerifiedMobileNumber(
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
                notificationEmailQueue.sendVerifiedMobileNumber
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.verifiedMobileNumber',
                completedSteps: [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ],
                failedSteps: [],
            });
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect', async () => {
            notificationEmailQueue.sendVerifiedMobileNumber.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                recipient,
                data,
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

            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
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
            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processVerifiedMobileNumber(
                'user-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.verifiedMobileNumber,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendVerifiedMobileNumber
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
            notificationEmailQueue.sendVerifiedMobileNumber.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );

            const first = await domain.processVerifiedMobileNumber(
                'user-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processVerifiedMobileNumber(
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
            expect(second).toEqual(first);
        });
    });
});
