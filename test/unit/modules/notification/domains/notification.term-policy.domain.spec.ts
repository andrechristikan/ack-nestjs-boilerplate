import { Test } from '@nestjs/testing';
import {
    buildTermPolicyMarker,
    buildTermPolicyRecipient,
} from '@test/unit/helpers/test.unit.notification-term-policy.helper';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { Notification } from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationTermPolicyPage } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationTermPolicyDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    let domain: NotificationTermPolicyDomain;

    const data = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 2,
        recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        resendNonce: null,
    };
    const u1 = { id: 'u1', email: 'u1@example.com', username: 'name-u1' };
    const u2 = { id: 'u2', email: 'u2@example.com', username: 'name-u2' };
    const u3 = { id: 'u3', email: 'u3@example.com', username: 'name-u3' };
    const u4 = { id: 'u4', email: 'u4@example.com', username: 'name-u4' };
    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-1',
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'Term policy published',
        body: 'A term policy was published',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'admin-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const publishChannels = [
        ...NotificationKindContract.publishTermPolicy.pendingChannels,
        ...NotificationKindContract.publishTermPolicy.deliveredChannels,
    ];

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number> = { 'email.batchSize': 3 };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                NotificationTermPolicyDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationTermPolicyDomain);
    });

    const sentAt = new Date('2024-01-02T00:00:00.000Z');
    const emptyPage: INotificationTermPolicyPage = {
        users: [],
        freshUsers: [],
        pendingBatchIds: [],
    };

    describe('emailBatchSize', () => {
        it('carries the configured email batch size', () => {
            expect(domain.emailBatchSize).toBe(3);
        });
    });

    describe('getPage', () => {
        it('marks users without a marker as fresh and finds no pending batch', async () => {
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B0', sentAt, sentAt),
            ]);

            const page = await domain.getPage(data.termPolicyId, [u1, u2]);

            expect(
                notificationRepository.findTermPolicyRecipients
            ).toHaveBeenCalledWith(data.termPolicyId, ['u1', 'u2']);
            expect(
                notificationRepository.findTermPolicyRecipientsSendableByBatchIds
            ).not.toHaveBeenCalled();
            expect(page).toEqual({
                users: [u1, u2],
                freshUsers: [u2],
                pendingBatchIds: [],
            });
        });

        it('treats a batch whose unsent rows are all claimed as not pending', async () => {
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B', null, sentAt),
                buildTermPolicyMarker('u2', 'B', null, sentAt),
            ]);

            const page = await domain.getPage(data.termPolicyId, [u1, u2]);

            expect(page.pendingBatchIds).toEqual([]);
            expect(page.freshUsers).toEqual([]);
        });

        it('names the batches that still hold an unsent, unclaimed row as pending', async () => {
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B'),
                buildTermPolicyMarker('u2', 'B', sentAt, sentAt),
            ]);

            const page = await domain.getPage(data.termPolicyId, [u1, u2, u3]);

            expect(page).toEqual({
                users: [u1, u2, u3],
                freshUsers: [u3],
                pendingBatchIds: ['B'],
            });
        });
    });

    describe('getPending', () => {
        it('reads nothing when no batch is pending', async () => {
            const pending = await domain.getPending(data.termPolicyId, {
                ...emptyPage,
                users: [u1],
            });

            expect(
                notificationRepository.findTermPolicyRecipientsSendableByBatchIds
            ).not.toHaveBeenCalled();
            expect(pending).toEqual({
                sendableMarkers: [],
                offPageUserIds: [],
            });
        });

        it('reads only the sendable rows of the pending batches and names the users off the page', async () => {
            const sendable = [
                buildTermPolicyMarker('u1', 'B'),
                buildTermPolicyMarker('u2', 'B'),
                buildTermPolicyMarker('u4', 'B'),
            ];
            notificationRepository.findTermPolicyRecipientsSendableByBatchIds.mockResolvedValue(
                sendable
            );

            const pending = await domain.getPending(data.termPolicyId, {
                users: [u1, u2, u3],
                freshUsers: [u3],
                pendingBatchIds: ['B'],
            });

            expect(
                notificationRepository.findTermPolicyRecipientsSendableByBatchIds
            ).toHaveBeenCalledWith(data.termPolicyId, ['B']);
            expect(pending).toEqual({
                sendableMarkers: sendable,
                offPageUserIds: ['u4'],
            });
        });
    });

    describe('sendFreshBatch', () => {
        it('creates the rows of the fresh users, then enqueues their batch at the given index', async () => {
            const calls: string[] = [];
            notificationRepository.createTermPolicyRecipients.mockImplementation(
                async () => {
                    calls.push('create');
                }
            );
            notificationEmailQueue.sendPublishTermPolicyBatch.mockImplementation(
                async () => {
                    calls.push('send');
                }
            );
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');
            const batches = await domain.sendFreshBatch(
                'admin-id',
                data,
                [u1, u2],
                4
            );

            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledWith(
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-1',
                            userId: 'u1',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                            channels: publishChannels,
                        },
                    },
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-2',
                            userId: 'u2',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                            channels: publishChannels,
                        },
                    },
                ],
                [
                    { userId: 'u1', notificationId: 'n-1' },
                    { userId: 'u2', notificationId: 'n-2' },
                ]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'batch-1', 'admin-id', 4, [
                buildTermPolicyRecipient(u1, 'n-1'),
                buildTermPolicyRecipient(u2, 'n-2'),
            ]);
            expect(calls).toEqual(['create', 'send']);
            expect(batches).toBe(1);
        });

        it('passes the resend nonce in data to the fresh batch', async () => {
            const resendData = { ...data, resendNonce: 'nonce-1' };
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-2');

            await domain.sendFreshBatch('admin-id', resendData, [u2], 1);

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(
                resendData,
                'batch-1',
                'admin-id',
                1,
                expect.anything()
            );
        });

        it('writes and enqueues nothing for no fresh user', async () => {
            const batches = await domain.sendFreshBatch(
                'admin-id',
                data,
                [],
                0
            );

            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).not.toHaveBeenCalled();
            expect(batches).toBe(0);
        });
    });

    describe('sendPendingBatches', () => {
        it('re-adds each pending batch with recipients from its markers, the page users, and the off-page users', async () => {
            const batches = await domain.sendPendingBatches(
                'admin-id',
                data,
                {
                    users: [u1, u2, u3],
                    freshUsers: [u3],
                    pendingBatchIds: ['B1', 'B2'],
                },
                {
                    sendableMarkers: [
                        buildTermPolicyMarker('u1', 'B1'),
                        buildTermPolicyMarker('u2', 'B2'),
                        buildTermPolicyMarker('u4', 'B2'),
                    ],
                    offPageUserIds: ['u4'],
                },
                [u4],
                2
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(2);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B1', 'admin-id', 2, [
                buildTermPolicyRecipient(u1, 'n-u1'),
            ]);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B2', 'admin-id', 3, [
                buildTermPolicyRecipient(u2, 'n-u2'),
                buildTermPolicyRecipient(u4, 'n-u4'),
            ]);
            expect(batches).toBe(2);
        });

        it('passes the resend nonce in data to a pending batch', async () => {
            const resendData = { ...data, resendNonce: 'nonce-1' };

            await domain.sendPendingBatches(
                'admin-id',
                resendData,
                { users: [u1], freshUsers: [], pendingBatchIds: ['B1'] },
                {
                    sendableMarkers: [buildTermPolicyMarker('u1', 'B1')],
                    offPageUserIds: [],
                },
                [],
                0
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(
                resendData,
                'B1',
                'admin-id',
                0,
                expect.anything()
            );
        });

        it('omits a pending marker whose user no longer resolves, enqueuing the batch with the rest', async () => {
            await domain.sendPendingBatches(
                'admin-id',
                data,
                { users: [u1], freshUsers: [], pendingBatchIds: ['B'] },
                {
                    sendableMarkers: [
                        buildTermPolicyMarker('u1', 'B'),
                        buildTermPolicyMarker('deleted-user', 'B'),
                    ],
                    offPageUserIds: ['deleted-user'],
                },
                [],
                0
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0, [
                buildTermPolicyRecipient(u1, 'n-u1'),
            ]);
        });

        it('enqueues a pending batch with no recipients when none of its markers resolves a user', async () => {
            const batches = await domain.sendPendingBatches(
                'admin-id',
                data,
                { users: [u1], freshUsers: [], pendingBatchIds: ['B'] },
                {
                    sendableMarkers: [
                        buildTermPolicyMarker('deleted-user', 'B'),
                    ],
                    offPageUserIds: ['deleted-user'],
                },
                [],
                0
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0, []);
            expect(batches).toBe(1);
        });

        it('enqueues nothing for a page with no pending batch', async () => {
            const batches = await domain.sendPendingBatches(
                'admin-id',
                data,
                { ...emptyPage, users: [u1, u2] },
                { sendableMarkers: [], offPageUserIds: [] },
                [],
                0
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).not.toHaveBeenCalled();
            expect(batches).toBe(0);
        });
    });

    describe('processUserAcceptTermPolicy', () => {
        const acceptData = { ...data, termPolicyId: 'term-policy-id' };
        const recipient = TestEncryptedRecipient;

        it('creates the row with the job notification id and the snapshot channels, and reports the step completed', async () => {
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                recipient,
                acceptData,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.userAcceptTermPolicy,
                    payload: {
                        id: 'n-1',
                        userId: 'user-id',
                        metadata: {
                            username: recipient.username,
                            type: acceptData.type,
                            version: acceptData.version,
                        },
                        createdBy: 'user-id',
                        channels: recipient.channels,
                    },
                },
            ]);
            expect(result).toEqual({
                message: 'notification.queue.userAcceptTermPolicy',
                completedSteps: [EnumNotificationStep.createNotification],
                failedSteps: [],
            });
        });

        it('declares the in-app channel as delivered at creation, with no pending delivery, for the accept kind', () => {
            expect(
                NotificationKindContract.userAcceptTermPolicy.pendingChannels
            ).toEqual([]);
            expect(
                NotificationKindContract.userAcceptTermPolicy.deliveredChannels
            ).toEqual([
                EnumNotificationChannel.silent,
                EnumNotificationChannel.inApp,
            ]);
        });

        it('creates no row and reports no failure when no channel is enabled', async () => {
            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                { ...recipient, channels: [] },
                acceptData,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [],
                failedSteps: [],
            });
        });

        it('makes the same decisions on a second pass over the same job', async () => {
            const createManyCalls: unknown[] = [];
            notificationRepository.createMany.mockImplementation(
                async entries => {
                    createManyCalls.push(entries);

                    return [notification];
                }
            );

            const first = await domain.processUserAcceptTermPolicy(
                'user-id',
                recipient,
                acceptData,
                'n-1',
                []
            );
            const second = await domain.processUserAcceptTermPolicy(
                'user-id',
                recipient,
                acceptData,
                'n-1',
                []
            );

            expect(createManyCalls).toHaveLength(2);
            expect(createManyCalls[1]).toEqual(createManyCalls[0]);
            expect(second).toEqual(first);
        });

        it('skips the create on a retry', async () => {
            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                recipient,
                acceptData,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.userAcceptTermPolicy',
                completedSteps: [EnumNotificationStep.createNotification],
                failedSteps: [],
            });
        });

        it('names the create step when the rows cannot be written', async () => {
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                recipient,
                acceptData,
                'n-1',
                []
            );

            expect(result).toEqual({
                message: 'notification.queue.error.failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        message: 'mongo',
                        rawError: new Error('mongo'),
                    },
                ],
            });
        });
    });
});
