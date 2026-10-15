import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { Notification } from '@generated/prisma-client/client';
import {
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
import type {
    INotificationCreateEntry,
    INotificationTermPolicyBatchRecipient,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import { TestEncryptedRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationTermPolicyDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    let domain: NotificationTermPolicyDomain;

    const data = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 2,
        recipientCutoffAt: '2024-01-01T00:00:00.000Z',
    };
    const cutoff = new Date('2024-01-01T00:00:00.000Z');
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

    const now = new Date('2024-01-03T00:00:00.000Z');
    const publishChannels = [
        ...NotificationKindContract.publishTermPolicy.pendingChannels,
        ...NotificationKindContract.publishTermPolicy.deliveredChannels,
    ];

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        helperDateService.createFromIso.mockReturnValue(cutoff);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number> = { 'email.batchSize': 3 };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                NotificationTermPolicyDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperDateService,
                    useValue: helperDateService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationTermPolicyDomain);
    });

    describe('processPublishTermPolicy', () => {
        const enqueuedAt = new Date('2024-01-02T00:00:00.000Z');

        const entryBase: INotificationCreateEntry = {
            kind: EnumNotificationKind.publishTermPolicy,
            payload: {
                id: 'n-1',
                userId: 'u1',
                metadata: { type: data.type, version: data.version },
                createdBy: 'admin-id',
                channels: publishChannels,
            },
        };
        const entryU1N1: INotificationCreateEntry = entryBase;
        const entryU2N2: INotificationCreateEntry = {
            ...entryBase,
            payload: { ...entryBase.payload, id: 'n-2', userId: 'u2' },
        };
        const entryU3N3: INotificationCreateEntry = {
            ...entryBase,
            payload: { ...entryBase.payload, id: 'n-3', userId: 'u3' },
        };
        const entryU4N4: INotificationCreateEntry = {
            ...entryBase,
            payload: { ...entryBase.payload, id: 'n-4', userId: 'u4' },
        };
        const entryU2N1: INotificationCreateEntry = {
            ...entryBase,
            payload: { ...entryBase.payload, userId: 'u2' },
        };
        const entryU3N1: INotificationCreateEntry = {
            ...entryBase,
            payload: { ...entryBase.payload, userId: 'u3' },
        };

        it('pages users created at or before the cutoff, creating, enqueuing and marking one batch per page', async () => {
            userDomain.getListRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([u4]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue(
                []
            );
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
            notificationRepository.markTermPolicyRecipientsEnqueued.mockImplementation(
                async () => {
                    calls.push('mark');
                }
            );
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2')
                .mockReturnValueOnce('n-3')
                .mockReturnValueOnce('batch-2')
                .mockReturnValueOnce('n-4');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                data.recipientCutoffAt
            );
            expect(userDomain.getListRecipientCursor).toHaveBeenNthCalledWith(
                1,
                null,
                3,
                cutoff
            );
            expect(userDomain.getListRecipientCursor).toHaveBeenNthCalledWith(
                2,
                'u3',
                3,
                cutoff
            );
            expect(userDomain.getListRecipientCursor).toHaveBeenCalledTimes(2);
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenNthCalledWith(
                1,
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [entryU1N1, entryU2N2, entryU3N3],
                [
                    { userId: 'u1', notificationId: 'n-1' },
                    { userId: 'u2', notificationId: 'n-2' },
                    { userId: 'u3', notificationId: 'n-3' },
                ]
            );
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenNthCalledWith(
                2,
                'admin-id',
                data.termPolicyId,
                'batch-2',
                [entryU4N4],
                [{ userId: 'u4', notificationId: 'n-4' }]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenNthCalledWith(1, data, 'batch-1', 'admin-id', 0, [
                {
                    userId: 'u1',
                    notificationId: 'n-1',
                    email: u1.email,
                    username: u1.username,
                },
                {
                    userId: 'u2',
                    notificationId: 'n-2',
                    email: u2.email,
                    username: u2.username,
                },
                {
                    userId: 'u3',
                    notificationId: 'n-3',
                    email: u3.email,
                    username: u3.username,
                },
            ]);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenNthCalledWith(2, data, 'batch-2', 'admin-id', 1, [
                {
                    userId: 'u4',
                    notificationId: 'n-4',
                    email: u4.email,
                    username: u4.username,
                },
            ]);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenNthCalledWith(
                1,
                data.termPolicyId,
                ['batch-1'],
                now,
                'admin-id'
            );
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenNthCalledWith(
                2,
                data.termPolicyId,
                ['batch-2'],
                now,
                'admin-id'
            );
            expect(calls).toEqual([
                'create',
                'send',
                'mark',
                'create',
                'send',
                'mark',
            ]);
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 4,
                createdCounts: 4,
                batches: 2,
            });
        });

        it('skips a candidate whose marker is already enqueued, creating and re-adding nothing', async () => {
            userDomain.getListRecipientCursor.mockResolvedValueOnce([u1, u2]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                {
                    userId: 'u1',
                    notificationId: 'n-0',
                    batchId: 'B0',
                    enqueuedAt,
                },
            ]);
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledWith(
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [entryU2N1],
                [{ userId: 'u2', notificationId: 'n-1' }]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'batch-1', 'admin-id', 0, [
                {
                    userId: 'u2',
                    notificationId: 'n-1',
                    email: u2.email,
                    username: u2.username,
                },
            ]);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                ['batch-1'],
                now,
                'admin-id'
            );
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 2,
                createdCounts: 1,
                batches: 1,
            });
        });

        it('re-adds every stored pending batch with recipients from its markers and the page users, then the new batch, and marks all of them', async () => {
            userDomain.getListRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    batchId: 'B1',
                    enqueuedAt: null,
                },
                {
                    userId: 'u2',
                    notificationId: 'n-b2',
                    batchId: 'B2',
                    enqueuedAt: null,
                },
            ]);
            notificationRepository.findTermPolicyRecipientsByBatchIds.mockResolvedValue(
                [
                    {
                        userId: 'u1',
                        notificationId: 'n-b1',
                        batchId: 'B1',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u2',
                        notificationId: 'n-b2',
                        batchId: 'B2',
                        enqueuedAt: null,
                    },
                ]
            );
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationRepository.findTermPolicyRecipientsByBatchIds
            ).toHaveBeenCalledWith(data.termPolicyId, ['B1', 'B2']);
            expect(userDomain.getManyRecipientsByIds).not.toHaveBeenCalled();
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledWith(
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [entryU3N1],
                [{ userId: 'u3', notificationId: 'n-1' }]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(3);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B1', 'admin-id', 0, [
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    email: u1.email,
                    username: u1.username,
                },
            ]);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B2', 'admin-id', 1, [
                {
                    userId: 'u2',
                    notificationId: 'n-b2',
                    email: u2.email,
                    username: u2.username,
                },
            ]);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'batch-1', 'admin-id', 2, [
                {
                    userId: 'u3',
                    notificationId: 'n-1',
                    email: u3.email,
                    username: u3.username,
                },
            ]);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                ['B1', 'B2', 'batch-1'],
                now,
                'admin-id'
            );
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 3,
                createdCounts: 1,
                batches: 3,
            });
        });

        it('omits a pending marker whose user is deleted before the batch is enqueued', async () => {
            userDomain.getListRecipientCursor.mockResolvedValueOnce([u1]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    batchId: 'B',
                    enqueuedAt: null,
                },
            ]);
            notificationRepository.findTermPolicyRecipientsByBatchIds.mockResolvedValue(
                [
                    {
                        userId: 'u1',
                        notificationId: 'n-b1',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'deleted-user',
                        notificationId: 'n-b2',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                ]
            );
            userDomain.getManyRecipientsByIds.mockResolvedValue([]);

            await domain.processPublishTermPolicy('admin-id', data);

            expect(userDomain.getManyRecipientsByIds).toHaveBeenCalledWith(
                ['deleted-user'],
                cutoff
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0, [
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    email: u1.email,
                    username: u1.username,
                },
            ]);
        });

        it('enqueues a pending batch with no recipients when none of its markers resolves a user', async () => {
            userDomain.getListRecipientCursor.mockResolvedValueOnce([u1]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    batchId: 'B',
                    enqueuedAt: null,
                },
            ]);
            notificationRepository.findTermPolicyRecipientsByBatchIds.mockResolvedValue(
                [
                    {
                        userId: 'deleted-user',
                        notificationId: 'n-b2',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                ]
            );
            userDomain.getManyRecipientsByIds.mockResolvedValue([]);

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0, []);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(data.termPolicyId, ['B'], now, 'admin-id');
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 1,
                createdCounts: 0,
                batches: 1,
            });
        });

        it('carries every eligible member of a batch spanning two pages after a deletion shifts the page', async () => {
            userDomain.getListRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([u4]);
            notificationRepository.findTermPolicyRecipients
                .mockResolvedValueOnce([
                    {
                        userId: 'u3',
                        notificationId: 'n-b3',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                ])
                .mockResolvedValueOnce([
                    {
                        userId: 'u4',
                        notificationId: 'n-b4',
                        batchId: 'B',
                        enqueuedAt,
                    },
                ]);
            notificationRepository.findTermPolicyRecipientsByBatchIds.mockResolvedValue(
                [
                    {
                        userId: 'u3',
                        notificationId: 'n-b3',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u4',
                        notificationId: 'n-b4',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                ]
            );
            userDomain.getManyRecipientsByIds.mockResolvedValue([u4]);
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');

            await domain.processPublishTermPolicy('admin-id', data);

            expect(userDomain.getManyRecipientsByIds).toHaveBeenCalledWith(
                ['u4'],
                cutoff
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0, [
                {
                    userId: 'u3',
                    notificationId: 'n-b3',
                    email: u3.email,
                    username: u3.username,
                },
                {
                    userId: 'u4',
                    notificationId: 'n-b4',
                    email: u4.email,
                    username: u4.username,
                },
            ]);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                expect.arrayContaining(['B']),
                now,
                'admin-id'
            );
        });

        it('builds identical pending batch recipients on two runs over the same page data', async () => {
            userDomain.getListRecipientCursor.mockResolvedValue([u1, u2]);
            const markers = [
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    batchId: 'B',
                    enqueuedAt: null,
                },
                {
                    userId: 'u2',
                    notificationId: 'n-b2',
                    batchId: 'B',
                    enqueuedAt: null,
                },
            ];
            notificationRepository.findTermPolicyRecipients
                .mockResolvedValueOnce(markers)
                .mockResolvedValueOnce([...markers].reverse());
            notificationRepository.findTermPolicyRecipientsByBatchIds.mockResolvedValue(
                markers
            );
            const sent: INotificationTermPolicyBatchRecipient[][] = [];
            notificationEmailQueue.sendPublishTermPolicyBatch.mockImplementation(
                async (_data, _batchId, _proceedBy, _index, recipients) => {
                    sent.push(recipients);
                }
            );

            await domain.processPublishTermPolicy('admin-id', data);
            await domain.processPublishTermPolicy('admin-id', data);

            expect(sent).toHaveLength(2);
            expect(sent[0]).toEqual(sent[1]);
        });

        it('adds a stored batch split across two pages exactly once', async () => {
            userDomain.getListRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([u4]);
            notificationRepository.findTermPolicyRecipients
                .mockResolvedValueOnce([
                    {
                        userId: 'u1',
                        notificationId: 'n-b1',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u2',
                        notificationId: 'n-b2',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u3',
                        notificationId: 'n-b3',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                ])
                .mockResolvedValueOnce([
                    {
                        userId: 'u4',
                        notificationId: 'n-b4',
                        batchId: 'B',
                        enqueuedAt,
                    },
                ]);
            notificationRepository.findTermPolicyRecipientsByBatchIds.mockResolvedValue(
                [
                    {
                        userId: 'u1',
                        notificationId: 'n-b1',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u2',
                        notificationId: 'n-b2',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u3',
                        notificationId: 'n-b3',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                    {
                        userId: 'u4',
                        notificationId: 'n-b4',
                        batchId: 'B',
                        enqueuedAt: null,
                    },
                ]
            );
            userDomain.getManyRecipientsByIds.mockResolvedValue([u4]);
            databaseUtil.createId.mockReturnValue('unused-id');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0, [
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    email: u1.email,
                    username: u1.username,
                },
                {
                    userId: 'u2',
                    notificationId: 'n-b2',
                    email: u2.email,
                    username: u2.username,
                },
                {
                    userId: 'u3',
                    notificationId: 'n-b3',
                    email: u3.email,
                    username: u3.username,
                },
                {
                    userId: 'u4',
                    notificationId: 'n-b4',
                    email: u4.email,
                    username: u4.username,
                },
            ]);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(data.termPolicyId, ['B'], now, 'admin-id');
            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 4,
                createdCounts: 0,
                batches: 1,
            });
        });

        it('advances the cursor past a full page whose candidates are all enqueued and writes nothing', async () => {
            userDomain.getListRecipientCursor
                .mockResolvedValueOnce([u1, u2, u3])
                .mockResolvedValueOnce([]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                {
                    userId: 'u1',
                    notificationId: 'n-b1',
                    batchId: 'B',
                    enqueuedAt,
                },
                {
                    userId: 'u2',
                    notificationId: 'n-b2',
                    batchId: 'B',
                    enqueuedAt,
                },
                {
                    userId: 'u3',
                    notificationId: 'n-b3',
                    batchId: 'B',
                    enqueuedAt,
                },
            ]);
            databaseUtil.createId.mockReturnValue('unused-id');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(userDomain.getListRecipientCursor).toHaveBeenNthCalledWith(
                2,
                'u3',
                3,
                cutoff
            );
            expect(userDomain.getListRecipientCursor).toHaveBeenCalledTimes(2);
            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 3,
                createdCounts: 0,
                batches: 0,
            });
        });

        it('returns zero counts and writes nothing when there is no candidate', async () => {
            userDomain.getListRecipientCursor.mockResolvedValueOnce([]);

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationRepository.findTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 0,
                createdCounts: 0,
                batches: 0,
            });
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
                message: 'User accept term policy notification processed',
                completedSteps: [EnumNotificationStep.createNotification],
                failedSteps: [],
            });
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
                message:
                    'User accept term policy notification skipped, no channel enabled',
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
                message: 'User accept term policy notification processed',
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
                message: 'User accept term policy notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });
});
