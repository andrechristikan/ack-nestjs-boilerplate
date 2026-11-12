import { Test } from '@nestjs/testing';
import { buildTermPolicyMarker } from '@test/unit/helpers/test.unit.notification-term-policy.helper';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationTermPolicyPage } from '@modules/notification/interfaces/notification.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { MessageService } from '@common/message/services/message.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

describe('NotificationTermPolicyService', () => {
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const tx = {} as IDatabaseTransactionClient;
    let service: NotificationTermPolicyService;

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
    const publishChannels = [
        ...NotificationKindContract.publishTermPolicy.pendingChannels,
        ...NotificationKindContract.publishTermPolicy.deliveredChannels,
    ];

    beforeEach(async () => {
        vi.resetAllMocks();
        helperEncryptionService.aes256Encrypt.mockImplementation(
            (value: string) => `enc-${value}`
        );
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number | string> = {
                'email.batchSize': 3,
                'app.encryptionSecretKey': 'encryption-secret',
                'notification.idempotencyKey.termPolicyBatchPattern':
                    '{process}-{termPolicyId}-{batchId}',
                'notification.idempotencyKey.termPolicyBatchResendPattern':
                    '{process}-{termPolicyId}-{batchId}-{resendNonce}',
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                NotificationTermPolicyService,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: MessageService, useValue: messageService },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = module.get(NotificationTermPolicyService);
    });

    const sentAt = new Date('2024-01-02T00:00:00.000Z');
    const emptyPage: INotificationTermPolicyPage = {
        users: [],
        freshUsers: [],
        pendingBatchIds: [],
    };

    describe('emailBatchSize', () => {
        it('carries the configured email batch size', () => {
            expect(service.emailBatchSize).toBe(3);
        });
    });

    describe('getPage', () => {
        it('marks users without a marker as fresh and finds no pending batch', async () => {
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                buildTermPolicyMarker('u1', 'B0', sentAt, sentAt),
            ]);

            const page = await service.getPage(data.termPolicyId, [u1, u2]);

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

            const page = await service.getPage(data.termPolicyId, [u1, u2]);

            expect(page.pendingBatchIds).toEqual([]);
            expect(page.freshUsers).toEqual([]);
        });

        it('names the batches that still hold an unsent, unclaimed row as pending', async () => {
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
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

            const pending = await service.getPending(data.termPolicyId, {
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
        it('creates the rows of the fresh users and adds their batch row on one tx, dispatching once', async () => {
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2');
            helperStringService.fillPattern.mockReturnValue('batch-key');

            const batches = await service.sendFreshBatch('admin-id', data, [
                u1,
                u2,
            ]);

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.createTermPolicyRecipientsInTx
            ).toHaveBeenCalledWith(
                tx,
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
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{termPolicyId}-{batchId}',
                {
                    process: EnumNotificationEmailProcess.publishTermPolicy,
                    termPolicyId: data.termPolicyId,
                    batchId: 'batch-1',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, {
                queue: EnumNotificationQueue.notificationEmail,
                name: EnumNotificationEmailProcess.publishTermPolicy,
                data: {
                    data,
                    batchId: 'batch-1',
                    proceedBy: 'admin-id',
                    recipients: [
                        {
                            userId: 'u1',
                            notificationId: 'n-1',
                            encryptedEmail: 'enc-u1@example.com',
                            username: 'name-u1',
                        },
                        {
                            userId: 'u2',
                            notificationId: 'n-2',
                            encryptedEmail: 'enc-u2@example.com',
                            username: 'name-u2',
                        },
                    ],
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'batch-key',
            });
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                notificationRepository.createTermPolicyRecipientsInTx
            );
            expect(batches).toBe(1);
        });

        it('encrypts each address against its user id', async () => {
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1');

            await service.sendFreshBatch('admin-id', data, [u1]);

            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'u1@example.com',
                'encryption-secret',
                NotificationPayloadEncryptionPurpose,
                'u1'
            );
        });

        it('keys the fresh batch with the resend pattern and the nonce when the data carries one', async () => {
            const resendData = { ...data, resendNonce: 'nonce-1' };
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-2');

            await service.sendFreshBatch('admin-id', resendData, [u2]);

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{termPolicyId}-{batchId}-{resendNonce}',
                {
                    process: EnumNotificationEmailProcess.publishTermPolicy,
                    termPolicyId: data.termPolicyId,
                    batchId: 'batch-1',
                    resendNonce: 'nonce-1',
                }
            );
        });

        it('opens no transaction for no fresh user', async () => {
            const batches = await service.sendFreshBatch('admin-id', data, []);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                notificationRepository.createTermPolicyRecipientsInTx
            ).not.toHaveBeenCalled();
            expect(batches).toBe(0);
        });
    });

    describe('sendPendingBatches', () => {
        beforeEach(() => {
            helperStringService.fillPattern.mockImplementation(
                (_pattern, values) => `key-${values.batchId}`
            );
        });

        it('re-adds each pending batch in one add with recipients from its markers, the page users, and the off-page users', async () => {
            const batches = await service.sendPendingBatches(
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

            expect(outboxService.addMany).toHaveBeenCalledTimes(1);
            expect(outboxService.addMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    queue: EnumNotificationQueue.notificationEmail,
                    name: EnumNotificationEmailProcess.publishTermPolicy,
                    idempotencyKey: 'key-B1',
                    data: {
                        data,
                        batchId: 'B1',
                        proceedBy: 'admin-id',
                        recipients: [
                            {
                                userId: 'u1',
                                notificationId: 'n-u1',
                                encryptedEmail: 'enc-u1@example.com',
                                username: 'name-u1',
                            },
                        ],
                    },
                }),
                expect.objectContaining({
                    idempotencyKey: 'key-B2',
                    data: {
                        data,
                        batchId: 'B2',
                        proceedBy: 'admin-id',
                        recipients: [
                            {
                                userId: 'u2',
                                notificationId: 'n-u2',
                                encryptedEmail: 'enc-u2@example.com',
                                username: 'name-u2',
                            },
                            {
                                userId: 'u4',
                                notificationId: 'n-u4',
                                encryptedEmail: 'enc-u4@example.com',
                                username: 'name-u4',
                            },
                        ],
                    },
                }),
            ]);
            expect(batches).toBe(2);
        });

        it('keys a pending batch with the resend pattern and the nonce when the data carries one', async () => {
            const resendData = { ...data, resendNonce: 'nonce-1' };

            await service.sendPendingBatches(
                'admin-id',
                resendData,
                { users: [u1], freshUsers: [], pendingBatchIds: ['B1'] },
                {
                    sendableMarkers: [buildTermPolicyMarker('u1', 'B1')],
                    offPageUserIds: [],
                },
                []
            );

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{termPolicyId}-{batchId}-{resendNonce}',
                {
                    process: EnumNotificationEmailProcess.publishTermPolicy,
                    termPolicyId: data.termPolicyId,
                    batchId: 'B1',
                    resendNonce: 'nonce-1',
                }
            );
        });

        it('omits a pending marker whose user no longer resolves, adding the batch with the rest', async () => {
            await service.sendPendingBatches(
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

            expect(outboxService.addMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    data: expect.objectContaining({
                        recipients: [expect.objectContaining({ userId: 'u1' })],
                    }),
                }),
            ]);
        });

        it('adds a pending batch with no recipients when none of its markers resolves a user', async () => {
            const batches = await service.sendPendingBatches(
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

            expect(outboxService.addMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    data: expect.objectContaining({ recipients: [] }),
                }),
            ]);
            expect(batches).toBe(1);
        });

        it('adds nothing for a page with no pending batch', async () => {
            const batches = await service.sendPendingBatches(
                'admin-id',
                data,
                { ...emptyPage, users: [u1, u2] },
                { sendableMarkers: [], offPageUserIds: [] },
                []
            );

            expect(outboxService.addMany).not.toHaveBeenCalled();
            expect(batches).toBe(0);
        });
    });

    describe('listPendingBatchIds', () => {
        const users = [
            { id: 'u1', email: 'u1@example.com', username: 'u1' },
            { id: 'u2', email: 'u2@example.com', username: 'u2' },
            { id: 'u3', email: 'u3@example.com', username: 'u3' },
        ];
        it('returns the distinct batch ids of the page users whose marker is unsent and unclaimed', () => {
            expect(
                service['listPendingBatchIds'](users, [
                    buildTermPolicyMarker('u1', 'b1', null, null),
                    buildTermPolicyMarker('u2', 'b1', null, null),
                    buildTermPolicyMarker('u3', 'b2', new Date(), null),
                ])
            ).toEqual(['b1']);
        });

        it('skips a claimed marker and a marker of a user off the page', () => {
            expect(
                service['listPendingBatchIds'](users, [
                    buildTermPolicyMarker('u1', 'b1', null, new Date()),
                    buildTermPolicyMarker('u9', 'b3', null, null),
                ])
            ).toEqual([]);
        });
    });
});
