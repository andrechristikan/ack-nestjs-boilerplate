import type { INotificationPushCleanupTokensEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationKind,
    EnumNotificationPushProcess,
    EnumNotificationQueue,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationPushSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationPushProcessSendUseCase } from '@modules/notification/use-cases/notification.push.process-send.use-case';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';

describe('NotificationPushProcessSendUseCase', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationPushDeliveryService: MockProxy<NotificationPushDeliveryService> =
        mock<NotificationPushDeliveryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    let useCase: NotificationPushProcessSendUseCase;

    const data: INotificationPushSendPayload = {
        kind: EnumNotificationKind.workspaceInvite,
        notificationId: 'notification-id',
        userId: 'user-id',
        username: 'invitee',
        encryptedTokens: ['cipher(token-1)', 'cipher(token-2)'],
        context: {
            userId: 'user-id',
            proceedBy: 'actor-id',
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Alice',
            reference: 'WI-ref',
            workspaceMemberRole: 'member',
            expiredAt: '2024-01-08T00:00:00.000Z',
            encryptedLink: 'cipher(https://app.test/invite/token)',
            snapshot: null,
            verificationId: null,
        },
        completedSteps: [],
        encryptedPendingTokens: null,
        encryptedFailureTokens: null,
    };

    const cleanupEffect: INotificationPushCleanupTokensEffect = {
        queue: EnumNotificationQueue.notificationPush,
        name: EnumNotificationPushProcess.cleanupTokens,
        data: {
            userId: 'user-id',
            encryptedFailureTokens: ['cipher(token-2)'],
        },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockReturnValue('secret-key');
        firebaseService.isInitialized.mockReturnValue(true);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushProcessSendUseCase,
                NotificationUtil,
                { provide: FirebaseService, useValue: firebaseService },
                {
                    provide: NotificationPushDeliveryService,
                    useValue: notificationPushDeliveryService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessSendUseCase);
    });

    describe('execute', () => {
        it('sends the body with each date field formatted to RFC 2822', async () => {
            const expiredAt = new Date('2026-06-01T00:00:00.000Z');
            helperDateService.createFromIso.mockReturnValue(expiredAt);
            helperDateService.formatToRFC2822.mockReturnValue(
                'Mon, 01 Jun 2026 00:00:00 +0000'
            );
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                kind: EnumNotificationKind.temporaryPasswordByAdmin,
                context: {
                    userId: 'user-id',
                    proceedBy: 'actor-id',
                    passwordExpiredAt: '2026-06-01T00:00:00.000Z',
                    snapshot: null,
                    verificationId: null,
                },
            });

            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                '2026-06-01T00:00:00.000Z'
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.temporaryPasswordByAdmin.body',
                {
                    properties: {
                        username: 'invitee',
                        passwordExpiredAt: 'Mon, 01 Jun 2026 00:00:00 +0000',
                    },
                }
            );
        });

        it('sends the contract title and body with the metadata, then stamps sent and adds the cleanup row on one tx', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: ['cipher(token-2)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([
                'token-2',
            ]);
            notificationService.cleanupTokensEffect.mockReturnValue(
                cleanupEffect
            );

            const result = await useCase.execute('outbox-id', data);

            expect(
                notificationPushDeliveryService.stampProcessed
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.workspaceInvite.body',
                {
                    properties: {
                        username: 'invitee',
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        inviterName: 'Alice',
                    },
                }
            );
            expect(
                notificationPushDeliveryService.sendMulticast
            ).toHaveBeenCalledWith(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                {
                    title: 'notification.notify.workspaceInvite.title',
                    body: 'notification.notify.workspaceInvite.body',
                },
                null,
                null
            );
            expect(
                notificationPushDeliveryService.stampSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                ['token-2'],
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(
                notificationService.cleanupTokensEffect
            ).toHaveBeenCalledWith('user-id', ['cipher(token-2)']);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                cleanupEffect
            );
            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                    EnumNotificationStep.updateSentAt,
                ],
                encryptedPendingTokens: [],
                encryptedFailureTokens: ['cipher(token-2)'],
            });
            expect(result).toEqual({ message: 'notification.queue.push.send' });
        });

        it('records the send step before the sent stamp, so a failed stamp does not re-send', async () => {
            const rawError = new Error('transaction failed');
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: ['cipher(token-2)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([
                'token-2',
            ]);
            outboxService.withTransaction.mockRejectedValue(rawError);

            await expect(useCase.execute('outbox-id', data)).rejects.toBe(
                rawError
            );

            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                ],
                encryptedPendingTokens: [],
                encryptedFailureTokens: ['cipher(token-2)'],
            });
        });

        it('adds no cleanup row when no token failed', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', data);

            expect(
                notificationPushDeliveryService.stampSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                [],
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('records the pending tokens and throws, stamping no sent, while a token is pending', async () => {
            const rawError = new Error('pending');
            const failure = {
                step: EnumNotificationStep.sendMulticast,
                rawError,
            };
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: ['cipher(token-1)'],
                failure,
            });
            notificationPushDeliveryService.toStepSummary.mockReturnValue(
                'steps failed'
            );

            await expect(
                useCase.execute('outbox-id', data)
            ).rejects.toMatchObject({
                constructor: QueueException,
                message: 'steps failed',
                rawError,
            });

            expect(
                notificationPushDeliveryService.toStepSummary
            ).toHaveBeenCalledWith([failure]);

            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [EnumNotificationStep.updateProcessAt],
                encryptedPendingTokens: ['cipher(token-1)'],
                encryptedFailureTokens: [],
            });
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('retries only the pending tokens and skips a completed step', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [EnumNotificationStep.updateProcessAt],
                encryptedPendingTokens: ['cipher(token-1)'],
                encryptedFailureTokens: [],
            });

            expect(
                notificationPushDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(
                notificationPushDeliveryService.sendMulticast
            ).toHaveBeenCalledWith(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                expect.anything(),
                [],
                ['cipher(token-1)']
            );
        });

        it('skips the send and the sent stamp when both are already recorded, reading no failure tokens', async () => {
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                    EnumNotificationStep.updateSentAt,
                ],
            });

            expect(
                notificationPushDeliveryService.sendMulticast
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                    EnumNotificationStep.updateSentAt,
                ],
                encryptedPendingTokens: null,
                encryptedFailureTokens: null,
            });
        });

        it('stamps the sent time with no failed tokens when the send is recorded and none were kept', async () => {
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                ],
            });

            expect(
                notificationPushDeliveryService.sendMulticast
            ).not.toHaveBeenCalled();
            expect(
                notificationService.decryptFailureTokens
            ).toHaveBeenCalledWith('user-id', []);
            expect(
                notificationPushDeliveryService.stampSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                [],
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('sends nothing while Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await useCase.execute('outbox-id', data);

            expect(
                notificationPushDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.push.error.firebaseNotInitialized',
            });
        });
    });
});
