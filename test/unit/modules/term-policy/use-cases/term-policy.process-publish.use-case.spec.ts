import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import {
    buildTermPolicyCursorPage as cursorPage,
    buildTermPolicyPage,
} from '@test/unit/helpers/test.unit.term-policy-recipient.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { UserService } from '@modules/user/services/user.service';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationEmailPublishTermPolicyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import type { ITermPolicyBulkQueuePayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRecipientService } from '@modules/term-policy/services/term-policy.recipient.service';
import { MessageService } from '@common/message/services/message.service';
import { TermPolicyProcessPublishUseCase } from '@modules/term-policy/use-cases/term-policy.process-publish.use-case';

describe('TermPolicyProcessPublishUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const termPolicyRecipientService: MockProxy<TermPolicyRecipientService> =
        mock<TermPolicyRecipientService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const tx = {} as IDatabaseTransactionClient;
    let useCase: TermPolicyProcessPublishUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                TermPolicyProcessPublishUseCase,
                {
                    provide: TermPolicyRecipientService,
                    useValue: termPolicyRecipientService,
                },
                { provide: NotificationService, useValue: notificationService },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: UserService, useValue: userService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(TermPolicyProcessPublishUseCase);
    });

    describe('execute', () => {
        const data = {
            termPolicyId: 'term-policy-id',
            type: EnumTermPolicyType.privacy,
            version: 2,
            recipientCutoffAt: '2024-01-01T00:00:00.000Z',
            resendNonce: null,
        };
        const cutoff = new Date('2024-01-01T00:00:00.000Z');
        const u1 = {
            id: 'u1',
            email: 'u1@example.com',
            username: 'u1',
            name: null,
        };
        const u2 = {
            id: 'u2',
            email: 'u2@example.com',
            username: 'u2',
            name: null,
        };
        const u3 = {
            id: 'u3',
            email: 'u3@example.com',
            username: 'u3',
            name: null,
        };
        const u4 = {
            id: 'u4',
            email: 'u4@example.com',
            username: 'u4',
            name: null,
        };
        const payload: ITermPolicyBulkQueuePayload<typeof data> = {
            proceedBy: 'admin-id',
            data,
        };
        const batchEffect: INotificationEmailPublishTermPolicyEffect = {
            queue: EnumNotificationQueue.notificationEmail,
            name: EnumNotificationEmailProcess.publishTermPolicy,
            data: { data, batchId: '', proceedBy: '', recipients: [] },
            priority: EnumQueuePriority.medium,
            idempotencyKey: null,
        };

        beforeEach(() => {
            Object.defineProperty(termPolicyRecipientService, 'batchSize', {
                value: 3,
            });
            termPolicyRecipientService.buildBatch.mockImplementation(users => {
                const recipients = [];
                for (const { id, email, username } of users) {
                    recipients.push({
                        userId: id,
                        notificationId: `n-${id}`,
                        email,
                        username,
                    });
                }

                return { batchId: `batch-${users[0]?.id}`, recipients };
            });
            notificationEmailQueue.emailPublishTermPolicyEffect.mockImplementation(
                (effectData, batchId, proceedBy) => ({
                    ...batchEffect,
                    data: {
                        data: effectData,
                        batchId,
                        proceedBy,
                        recipients: [],
                    },
                    idempotencyKey: `key-${batchId}`,
                })
            );
        });

        it('pages the active users at the cutoff and adds one batch per page of fresh users, counting the batches', async () => {
            userService.getListActiveRecipientCursor
                .mockResolvedValueOnce(cursorPage([u1, u2, u3], true))
                .mockResolvedValueOnce(cursorPage([u4], false));
            termPolicyRecipientService.getPage
                .mockResolvedValueOnce(buildTermPolicyPage([u1, u2, u3]))
                .mockResolvedValueOnce(buildTermPolicyPage([u4]));

            const result = await useCase.execute(payload);

            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(1, null, 3, cutoff);
            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(2, 'cursor-after-u3', 3, cutoff);
            expect(
                userService.getManyActiveRecipientsByIds
            ).not.toHaveBeenCalled();
            expect(termPolicyRecipientService.getPage).toHaveBeenNthCalledWith(
                1,
                data.termPolicyId,
                [u1, u2, u3]
            );
            expect(
                termPolicyRecipientService.getPending
            ).not.toHaveBeenCalled();
            expect(
                termPolicyRecipientService.sendPendingBatchesInTx
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                message: 'termPolicy.queue.publish',
                candidateCounts: 4,
                createdCounts: 4,
                batches: 2,
            });
        });

        it('creates the notifications, the recipients, and the batch row of the fresh users on one tx in order', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1, u2], false)
            );
            termPolicyRecipientService.getPage.mockResolvedValue(
                buildTermPolicyPage([u1, u2])
            );
            const recipients = [
                {
                    userId: 'u1',
                    notificationId: 'n-u1',
                    email: 'u1@example.com',
                    username: 'u1',
                },
                {
                    userId: 'u2',
                    notificationId: 'n-u2',
                    email: 'u2@example.com',
                    username: 'u2',
                },
            ];

            await useCase.execute(payload);

            expect(termPolicyRecipientService.buildBatch).toHaveBeenCalledWith([
                u1,
                u2,
            ]);
            expect(
                notificationEmailQueue.emailPublishTermPolicyEffect
            ).toHaveBeenCalledWith(data, 'batch-u1', 'admin-id', recipients);
            expect(notificationService.createManyInTx).toHaveBeenCalledWith(
                tx,
                EnumNotificationKind.publishTermPolicy,
                { type: data.type, version: data.version },
                'admin-id',
                recipients
            );
            expect(
                termPolicyRecipientService.createManyInTx
            ).toHaveBeenCalledWith(
                tx,
                'admin-id',
                data.termPolicyId,
                'batch-u1',
                recipients
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                expect.objectContaining({ idempotencyKey: 'key-batch-u1' })
            );
            expect(
                termPolicyRecipientService.createManyInTx
            ).toHaveBeenCalledAfter(notificationService.createManyInTx);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRecipientService.createManyInTx
            );
        });

        it('starts the recipient write while the notification write is still pending, and adds the batch row after both', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1], false)
            );
            termPolicyRecipientService.getPage.mockResolvedValue(
                buildTermPolicyPage([u1])
            );
            const events: string[] = [];
            notificationService.createManyInTx.mockImplementation(async () => {
                events.push('notifications start');
                await Promise.resolve();
                await Promise.resolve();
                events.push('notifications end');
            });
            termPolicyRecipientService.createManyInTx.mockImplementation(
                async () => {
                    events.push('recipients start');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                events.push('batch row');

                return 'outbox-1';
            });

            await useCase.execute(payload);

            expect(events).toEqual([
                'notifications start',
                'recipients start',
                'notifications end',
                'batch row',
            ]);
        });

        it('fetches the active users off the page that a pending batch names before sending them', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1], false)
            );
            const page = buildTermPolicyPage([u1], [], ['B']);
            const pending = { sendableMarkers: [], offPageUserIds: ['u4'] };
            termPolicyRecipientService.getPage.mockResolvedValue(page);
            termPolicyRecipientService.getPending.mockResolvedValue(pending);
            userService.getManyActiveRecipientsByIds.mockResolvedValue([u4]);
            termPolicyRecipientService.sendPendingBatchesInTx.mockResolvedValue(
                1
            );

            const result = await useCase.execute(payload);

            expect(termPolicyRecipientService.getPending).toHaveBeenCalledWith(
                data.termPolicyId,
                page
            );
            expect(
                userService.getManyActiveRecipientsByIds
            ).toHaveBeenCalledWith(['u4'], cutoff);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyRecipientService.sendPendingBatchesInTx
            ).toHaveBeenCalledWith(tx, 'admin-id', data, page, pending, [u4]);
            expect(
                termPolicyRecipientService.buildBatch
            ).not.toHaveBeenCalled();
            expect(result).toMatchObject({
                candidateCounts: 1,
                createdCounts: 0,
                batches: 1,
            });
        });

        it('reads no off-page user when a pending batch names none', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1], false)
            );
            const page = buildTermPolicyPage([u1], [], ['B']);
            termPolicyRecipientService.getPage.mockResolvedValue(page);
            termPolicyRecipientService.getPending.mockResolvedValue({
                sendableMarkers: [],
                offPageUserIds: [],
            });
            termPolicyRecipientService.sendPendingBatchesInTx.mockResolvedValue(
                1
            );

            await useCase.execute(payload);

            expect(
                userService.getManyActiveRecipientsByIds
            ).not.toHaveBeenCalled();
            expect(
                termPolicyRecipientService.sendPendingBatchesInTx
            ).toHaveBeenCalledWith(
                tx,
                'admin-id',
                data,
                page,
                { sendableMarkers: [], offPageUserIds: [] },
                []
            );
        });

        it('sends the pending batches and creates the fresh batch of one page in one transaction, counting both', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1, u2], false)
            );
            const page = buildTermPolicyPage([u1, u2], [u2], ['B1', 'B2']);
            const pending = { sendableMarkers: [], offPageUserIds: [] };
            termPolicyRecipientService.getPage.mockResolvedValue(page);
            termPolicyRecipientService.getPending.mockResolvedValue(pending);
            termPolicyRecipientService.sendPendingBatchesInTx.mockResolvedValue(
                2
            );

            const result = await useCase.execute(payload);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyRecipientService.sendPendingBatchesInTx
            ).toHaveBeenCalledWith(tx, 'admin-id', data, page, pending, []);
            expect(termPolicyRecipientService.buildBatch).toHaveBeenCalledWith([
                u2,
            ]);
            expect(notificationService.createManyInTx).toHaveBeenCalledAfter(
                termPolicyRecipientService.sendPendingBatchesInTx
            );
            expect(
                termPolicyRecipientService.createManyInTx
            ).toHaveBeenCalledAfter(notificationService.createManyInTx);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRecipientService.createManyInTx
            );
            expect(result).toMatchObject({ createdCounts: 1, batches: 3 });
        });

        it('reads the pending markers and the off-page users before it opens the transaction', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1], false)
            );
            const page = buildTermPolicyPage([u1], [], ['B']);
            termPolicyRecipientService.getPage.mockResolvedValue(page);
            termPolicyRecipientService.getPending.mockResolvedValue({
                sendableMarkers: [],
                offPageUserIds: ['u4'],
            });
            userService.getManyActiveRecipientsByIds.mockResolvedValue([u4]);

            await useCase.execute(payload);

            expect(termPolicyRecipientService.getPage).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(
                termPolicyRecipientService.getPending
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(
                userService.getManyActiveRecipientsByIds
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
        });

        it('advances the cursor past a full page that sends nothing and opens no transaction', async () => {
            userService.getListActiveRecipientCursor
                .mockResolvedValueOnce(cursorPage([u1, u2, u3], true))
                .mockResolvedValueOnce(cursorPage([u4], false));
            termPolicyRecipientService.getPage
                .mockResolvedValueOnce(buildTermPolicyPage([u1, u2, u3], []))
                .mockResolvedValueOnce(buildTermPolicyPage([u4], []));

            const result = await useCase.execute(payload);

            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenNthCalledWith(2, 'cursor-after-u3', 3, cutoff);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'termPolicy.queue.publish',
                candidateCounts: 4,
                createdCounts: 0,
                batches: 0,
            });
        });

        it('stops after a page that has no next page', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([u1, u2, u3], false)
            );
            termPolicyRecipientService.getPage.mockResolvedValue(
                buildTermPolicyPage([u1, u2, u3])
            );

            const result = await useCase.execute(payload);

            expect(
                userService.getListActiveRecipientCursor
            ).toHaveBeenCalledTimes(1);
            expect(result).toMatchObject({ candidateCounts: 3, batches: 1 });
        });

        it('reads and sends nothing when there is no candidate', async () => {
            userService.getListActiveRecipientCursor.mockResolvedValueOnce(
                cursorPage([], false)
            );

            const result = await useCase.execute(payload);

            expect(termPolicyRecipientService.getPage).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'termPolicy.queue.publish',
                candidateCounts: 0,
                createdCounts: 0,
                batches: 0,
            });
        });
    });
});
