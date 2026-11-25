import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildTermPolicyMarker } from '@test/unit/helpers/test.unit.term-policy-recipient.helper';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import {
    EnumNotificationEmailProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { INotificationEmailPublishTermPolicyEffect } from '@modules/notification/interfaces/notification.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import type { ITermPolicyRecipientPage } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRecipientRepository } from '@modules/term-policy/repositories/term-policy.recipient.repository';
import { TermPolicyRecipientService } from '@modules/term-policy/services/term-policy.recipient.service';

describe('TermPolicyRecipientService', () => {
    const termPolicyRecipientRepository: MockProxy<TermPolicyRecipientRepository> =
        mock<TermPolicyRecipientRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const tx = {} as IDatabaseTransactionClient;
    let service: TermPolicyRecipientService;
    let databaseUtil: DatabaseUtil;

    const data = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 2,
        recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        resendNonce: null,
    };
    const u1 = {
        id: 'u1',
        email: 'u1@example.com',
        username: 'name-u1',
        name: null,
    };
    const u2 = {
        id: 'u2',
        email: 'u2@example.com',
        username: 'name-u2',
        name: null,
    };
    const u3 = {
        id: 'u3',
        email: 'u3@example.com',
        username: 'name-u3',
        name: null,
    };
    const u4 = {
        id: 'u4',
        email: 'u4@example.com',
        username: 'name-u4',
        name: null,
    };
    const batchEffect: INotificationEmailPublishTermPolicyEffect = {
        queue: EnumNotificationQueue.notificationEmail,
        name: EnumNotificationEmailProcess.publishTermPolicy,
        data: { data, batchId: '', proceedBy: '', recipients: [] },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
    };

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(sentAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        notificationEmailQueue.emailPublishTermPolicyEffect.mockImplementation(
            (effectData, batchId, proceedBy, recipients) => ({
                ...batchEffect,
                data: { data: effectData, batchId, proceedBy, recipients: [] },
                idempotencyKey: `key-${batchId}-${recipients.length}`,
            })
        );
        const module = await Test.createTestingModule({
            providers: [
                TermPolicyRecipientService,
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                {
                    provide: TermPolicyRecipientRepository,
                    useValue: termPolicyRecipientRepository,
                },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'email.batchSize': 3,
                    }),
                },
            ],
        }).compile();
        service = module.get(TermPolicyRecipientService);
        databaseUtil = module.get(DatabaseUtil);
    });

    const sentAt = new Date('2024-01-02T00:00:00.000Z');
    const emptyPage: ITermPolicyRecipientPage = {
        users: [],
        freshUsers: [],
        pendingBatchIds: [],
    };

    describe('batchSize', () => {
        it('carries the configured email batch size', () => {
            expect(service.batchSize).toBe(3);
        });
    });

    describe('getPage', () => {
        it('marks users without a marker as fresh and finds no pending batch', async () => {
            termPolicyRecipientRepository.findManyByUserIds.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B0', sentAt, sentAt),
            ]);

            const page = await service.getPage(data.termPolicyId, [u1, u2]);

            expect(
                termPolicyRecipientRepository.findManyByUserIds
            ).toHaveBeenCalledWith(data.termPolicyId, ['u1', 'u2']);
            expect(
                termPolicyRecipientRepository.findManySendableByBatchIds
            ).not.toHaveBeenCalled();
            expect(page).toEqual({
                users: [u1, u2],
                freshUsers: [u2],
                pendingBatchIds: [],
            });
        });

        it('treats a batch whose unsent rows are all claimed as not pending', async () => {
            termPolicyRecipientRepository.findManyByUserIds.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B', null, sentAt),
                buildTermPolicyMarker('u2', 'B', null, sentAt),
            ]);

            const page = await service.getPage(data.termPolicyId, [u1, u2]);

            expect(page.pendingBatchIds).toEqual([]);
            expect(page.freshUsers).toEqual([]);
        });

        it('names the batches that still hold an unsent, unclaimed row as pending', async () => {
            termPolicyRecipientRepository.findManyByUserIds.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B'),
                buildTermPolicyMarker('u2', 'B', sentAt, sentAt),
            ]);

            const page = await service.getPage(data.termPolicyId, [u1, u2, u3]);

            expect(page).toEqual({
                users: [u1, u2, u3],
                freshUsers: [u3],
                pendingBatchIds: ['B'],
            });
        });
    });

    describe('getPending', () => {
        it('reads nothing when no batch is pending', async () => {
            const pending = await service.getPending(data.termPolicyId, {
                ...emptyPage,
                users: [u1],
            });

            expect(
                termPolicyRecipientRepository.findManySendableByBatchIds
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
            termPolicyRecipientRepository.findManySendableByBatchIds.mockResolvedValue(
                sendable
            );

            const pending = await service.getPending(data.termPolicyId, {
                users: [u1, u2, u3],
                freshUsers: [u3],
                pendingBatchIds: ['B'],
            });

            expect(
                termPolicyRecipientRepository.findManySendableByBatchIds
            ).toHaveBeenCalledWith(data.termPolicyId, ['B']);
            expect(pending).toEqual({
                sendableMarkers: sendable,
                offPageUserIds: ['u4'],
            });
        });
    });

    describe('buildBatch', () => {
        it('returns one batch id and one notification id per user beside the user id, email, and username', () => {
            const createId = vi
                .spyOn(databaseUtil, 'createId')
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');

            const batch = service.buildBatch([u1, u2]);

            expect(batch).toEqual({
                batchId: 'batch-1',
                recipients: [
                    {
                        userId: 'u1',
                        notificationId: 'n-1',
                        email: 'u1@example.com',
                        username: 'name-u1',
                    },
                    {
                        userId: 'u2',
                        notificationId: 'n-2',
                        email: 'u2@example.com',
                        username: 'name-u2',
                    },
                ],
            });
            expect(createId).toHaveBeenCalledTimes(3);
        });
    });

    describe('createManyInTx', () => {
        it('forwards the recipients to the repository on the caller tx', async () => {
            const recipients = [
                { userId: 'u1', notificationId: 'n-1' },
                { userId: 'u2', notificationId: 'n-2' },
            ];

            await service.createManyInTx(
                tx,
                'admin-id',
                data.termPolicyId,
                'batch-1',
                recipients
            );

            expect(
                termPolicyRecipientRepository.createManyInTx
            ).toHaveBeenCalledWith(
                tx,
                'admin-id',
                data.termPolicyId,
                'batch-1',
                recipients
            );
        });
    });

    describe('claim', () => {
        it('claims under a drawn nonce and the current time, returning the nonce and the claimed user ids', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('claim-id');
            termPolicyRecipientRepository.claim.mockResolvedValue(['u2']);

            const claim = await service.claim(
                data.termPolicyId,
                'batch-1',
                ['u1', 'u2'],
                'admin-id'
            );

            expect(termPolicyRecipientRepository.claim).toHaveBeenCalledWith(
                data.termPolicyId,
                'batch-1',
                ['u1', 'u2'],
                'claim-id',
                sentAt,
                'admin-id'
            );
            expect(claim).toEqual({ claimNonce: 'claim-id', userIds: ['u2'] });
        });
    });

    describe('markSentInTx', () => {
        it('forwards the claim and the sent time to the repository on the caller tx', async () => {
            await service.markSentInTx(
                tx,
                'claim-id',
                ['u1'],
                sentAt,
                'admin-id'
            );

            expect(
                termPolicyRecipientRepository.markSentInTx
            ).toHaveBeenCalledWith(tx, 'claim-id', ['u1'], sentAt, 'admin-id');
        });
    });

    describe('release', () => {
        it('releases the claimed recipients through the repository', async () => {
            await service.release('claim-id', ['u1', 'u2'], 'admin-id');

            expect(termPolicyRecipientRepository.release).toHaveBeenCalledWith(
                'claim-id',
                ['u1', 'u2'],
                'admin-id'
            );
        });

        it('runs no statement for an empty list', async () => {
            await service.release('claim-id', [], 'admin-id');

            expect(
                termPolicyRecipientRepository.release
            ).not.toHaveBeenCalled();
        });
    });

    describe('sendPendingBatchesInTx', () => {
        it('re-adds each pending batch in one add with recipients from its markers, the page users, and the off-page users', async () => {
            const batches = await service.sendPendingBatchesInTx(
                tx,
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
                [u4]
            );

            expect(
                notificationEmailQueue.emailPublishTermPolicyEffect
            ).toHaveBeenNthCalledWith(1, data, 'B1', 'admin-id', [
                {
                    userId: 'u1',
                    notificationId: 'n-u1',
                    email: 'u1@example.com',
                    username: 'name-u1',
                },
            ]);
            expect(
                notificationEmailQueue.emailPublishTermPolicyEffect
            ).toHaveBeenNthCalledWith(2, data, 'B2', 'admin-id', [
                {
                    userId: 'u2',
                    notificationId: 'n-u2',
                    email: 'u2@example.com',
                    username: 'name-u2',
                },
                {
                    userId: 'u4',
                    notificationId: 'n-u4',
                    email: 'u4@example.com',
                    username: 'name-u4',
                },
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                expect.objectContaining({ idempotencyKey: 'key-B1-1' }),
                expect.objectContaining({ idempotencyKey: 'key-B2-2' }),
            ]);
            expect(batches).toBe(2);
        });

        it('omits a pending marker whose user no longer resolves, adding the batch with the rest', async () => {
            await service.sendPendingBatchesInTx(
                tx,
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
                []
            );

            expect(
                notificationEmailQueue.emailPublishTermPolicyEffect
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', [
                expect.objectContaining({ userId: 'u1' }),
            ]);
        });

        it('adds a pending batch with no recipients when none of its markers resolves a user', async () => {
            const batches = await service.sendPendingBatchesInTx(
                tx,
                'admin-id',
                data,
                { users: [u1], freshUsers: [], pendingBatchIds: ['B'] },
                {
                    sendableMarkers: [
                        buildTermPolicyMarker('deleted-user', 'B'),
                    ],
                    offPageUserIds: ['deleted-user'],
                },
                []
            );

            expect(
                notificationEmailQueue.emailPublishTermPolicyEffect
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', []);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(batches).toBe(1);
        });

        it('returns 0 and adds nothing for a page with no pending batch', async () => {
            const batches = await service.sendPendingBatchesInTx(
                tx,
                'admin-id',
                data,
                { ...emptyPage, users: [u1, u2] },
                { sendableMarkers: [], offPageUserIds: [] },
                []
            );

            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(batches).toBe(0);
        });
    });

    describe('listPendingBatchIds', () => {
        const users = [
            { id: 'u1', email: 'u1@example.com', username: 'u1', name: null },
            { id: 'u2', email: 'u2@example.com', username: 'u2', name: null },
            { id: 'u3', email: 'u3@example.com', username: 'u3', name: null },
        ];
        it('returns the distinct batch ids of the page users whose marker is unsent and unclaimed', () => {
            expect(
                service['listPendingBatchIds'](users, [
                    buildTermPolicyMarker('u1', 'b1', null, null),
                    buildTermPolicyMarker('u2', 'b1', null, null),
                    buildTermPolicyMarker(
                        'u3',
                        'b2',
                        new Date('2026-01-01T00:00:00.000Z'),
                        null
                    ),
                ])
            ).toEqual(['b1']);
        });

        it('skips a claimed marker and a marker of a user off the page', () => {
            expect(
                service['listPendingBatchIds'](users, [
                    buildTermPolicyMarker(
                        'u1',
                        'b1',
                        null,
                        new Date('2026-01-01T00:00:00.000Z')
                    ),
                    buildTermPolicyMarker('u9', 'b3', null, null),
                ])
            ).toEqual([]);
        });
    });
});
