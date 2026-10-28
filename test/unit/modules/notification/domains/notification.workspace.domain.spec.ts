import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Notification } from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationWorkspaceDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    let domain: NotificationWorkspaceDomain;

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
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'Workspace notification',
        body: 'Workspace activity',
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
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationWorkspaceDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
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
        domain = module.get(NotificationWorkspaceDomain);
    });

    describe('processWorkspaceInvite', () => {
        const data: INotificationWorkspaceInviteEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Omar',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            encryptedInviteAcceptLink: 'cipher-link',
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceInvite,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                            inviterName: data.inviterName,
                        },
                        createdBy: 'admin-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).toHaveBeenCalledWith(pushPayload, {
                workspaceId: data.workspaceId,
                workspaceName: data.workspaceName,
                inviterName: data.inviterName,
                workspaceMemberRole: data.workspaceMemberRole,
                reference: data.reference,
                expiredAt: data.expiredAt,
            });
            expect(result).toEqual({
                message: 'notification.queue.workspaceInvite',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processWorkspaceInvite(
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
                notificationEmailQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendWorkspaceInvite.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceInvite
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

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceInvite
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
            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceInvite,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInvite
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
            notificationEmailQueue.sendWorkspaceInvite.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendWorkspaceInvite.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processWorkspaceInvite(
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

    describe('processWorkspaceJoinRequest', () => {
        const data: INotificationWorkspaceJoinRequestEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
            joinRequestId: 'join-request-id',
            encryptedJoinRequestReviewLink: 'cipher-review-link',
        };

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinRequest,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                            requesterName: data.requesterName,
                        },
                        createdBy: 'admin-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(pushPayload, {
                workspaceId: data.workspaceId,
                workspaceName: data.workspaceName,
                requesterName: data.requesterName,
            });
            expect(result).toEqual({
                message: 'notification.queue.workspaceJoinRequest',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processWorkspaceJoinRequest(
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
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendWorkspaceJoinRequest.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
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

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
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
            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinRequest,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
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
            notificationEmailQueue.sendWorkspaceJoinRequest.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendWorkspaceJoinRequest.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processWorkspaceJoinRequest(
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

    describe('processWorkspaceJoinAccepted', () => {
        const data: INotificationWorkspaceJoinAcceptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
        };

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinAccepted,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                        },
                        createdBy: 'admin-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(pushPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.workspaceJoinAccepted',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
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
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendWorkspaceJoinAccepted.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
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

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
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
            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinAccepted,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
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
            notificationEmailQueue.sendWorkspaceJoinAccepted.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendWorkspaceJoinAccepted.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processWorkspaceJoinAccepted(
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

    describe('processWorkspaceJoinRejected', () => {
        const data: INotificationWorkspaceJoinRejectedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinRejected,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                            rejectReasonCode: data.rejectReasonCode,
                        },
                        createdBy: 'admin-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(pushPayload, data);
            expect(result).toEqual({
                message: 'notification.queue.workspaceJoinRejected',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            const result = await domain.processWorkspaceJoinRejected(
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
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                noPushRecipient,
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            notificationEmailQueue.sendWorkspaceJoinRejected.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
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

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
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
            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                noChannelRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('creates the row with the remaining channels and skips the email when the email channel is disabled', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                inAppRecipient,
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinRejected,
                    payload: expect.objectContaining({
                        channels: [EnumNotificationChannel.inApp],
                    }),
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(result.failedSteps).toEqual([]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
            ]);
        });

        it('skips the push when the push channel is disabled', async () => {
            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                emailOnlyRecipient,
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
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
            notificationEmailQueue.sendWorkspaceJoinRejected.mockImplementation(
                async (...args) => {
                    emailCalls0.push(args);
                }
            );
            const pushCalls0: unknown[] = [];
            notificationPushQueue.sendWorkspaceJoinRejected.mockImplementation(
                async (...args) => {
                    pushCalls0.push(args);
                }
            );

            const first = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                recipient,
                data,
                'n-1',
                []
            );
            const second = await domain.processWorkspaceJoinRejected(
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
});
