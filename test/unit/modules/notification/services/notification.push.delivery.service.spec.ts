import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { TestPushStampedAt } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UnrecoverableError } from 'bullmq';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IFirebasePushResult } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

describe('NotificationPushDeliveryService', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    let service: NotificationPushDeliveryService;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        helperDateService.create.mockReturnValue(TestPushStampedAt);
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushDeliveryService,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: MessageService, useValue: messageService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: FirebaseService, useValue: firebaseService },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        service = module.get(NotificationPushDeliveryService);
    });

    describe('stampProcessed', () => {
        it('stamps processedAt on the push delivery row', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                true
            );

            await service.stampProcessed(
                'notification-id',
                EnumNotificationPushProcess.send,
                'proceed-by-id'
            );

            expect(
                notificationRepository.updateDeliveryProcessedAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.push,
                TestPushStampedAt,
                'proceed-by-id'
            );
        });

        it('throws an UnrecoverableError naming the process when no delivery row matches', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                false
            );

            await expect(
                service.stampProcessed(
                    'notification-id',
                    EnumNotificationPushProcess.send,
                    'proceed-by-id'
                )
            ).rejects.toMatchObject({
                constructor: UnrecoverableError,
                message: 'notification.queue.push.error.deliveryNotFound',
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.push.error.deliveryNotFound',
                {
                    properties: {
                        process: EnumNotificationPushProcess.send,
                    },
                }
            );
        });
    });

    describe('sendMulticast', () => {
        const payload = { title: 'Title', body: 'Body' };
        const emptyResult: IFirebasePushResult = {
            successCount: 1,
            failureCount: 0,
            failureTokens: [],
            retryTokens: [],
        };

        beforeEach(() => {
            notificationUtil.decryptPayload.mockImplementation(
                (encrypted: string) =>
                    encrypted.replace(/^cipher\((.*)\)$/, '$1')
            );
        });

        it('sends to the pending tokens when recorded and returns the outcome', async () => {
            firebaseService.sendMulticast.mockResolvedValue(emptyResult);

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                payload,
                [],
                ['cipher(token-1)']
            );

            expect(notificationUtil.decryptPayload).toHaveBeenCalledWith(
                'cipher(token-1)',
                'user-id'
            );
            expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
                ['token-1'],
                payload
            );
            expect(sent).toEqual({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            expect(messageService.setMessage).not.toHaveBeenCalled();
        });

        it('sends to every token when none is pending', async () => {
            firebaseService.sendMulticast.mockResolvedValue(emptyResult);

            await service.sendMulticast(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                payload,
                null,
                null
            );

            expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
                ['token-1', 'token-2'],
                payload
            );
        });

        it('rethrows a decryption failure', async () => {
            const failure = new Error('decrypt');
            notificationUtil.decryptPayload.mockImplementation(() => {
                throw failure;
            });

            await expect(
                service.sendMulticast(
                    'user-id',
                    ['cipher(token-1)'],
                    payload,
                    null,
                    null
                )
            ).rejects.toBe(failure);
            expect(firebaseService.sendMulticast).not.toHaveBeenCalled();
        });

        it('maps the failure tokens back to their ciphertexts with no failure when none is pending', async () => {
            firebaseService.sendMulticast.mockResolvedValue({
                successCount: 1,
                failureCount: 1,
                failureTokens: ['token-1'],
                retryTokens: [],
            });

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                payload,
                null,
                null
            );

            expect(sent).toEqual({
                encryptedFailureTokens: ['cipher(token-1)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            expect(messageService.setMessage).not.toHaveBeenCalled();
        });

        it('merges the recorded failure tokens and drops duplicates', async () => {
            firebaseService.sendMulticast.mockResolvedValue({
                successCount: 1,
                failureCount: 1,
                failureTokens: ['token-1'],
                retryTokens: [],
            });

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                payload,
                ['cipher(old)', 'cipher(token-1)'],
                null
            );

            expect(sent.encryptedFailureTokens).toEqual([
                'cipher(old)',
                'cipher(token-1)',
            ]);
        });

        it('keeps the retry tokens as pending and fails the multicast step', async () => {
            firebaseService.sendMulticast.mockResolvedValue({
                successCount: 0,
                failureCount: 2,
                failureTokens: [],
                retryTokens: ['token-1', 'token-2'],
            });

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                payload,
                null,
                null
            );

            expect(sent).toEqual({
                encryptedFailureTokens: [],
                encryptedPendingTokens: ['cipher(token-1)', 'cipher(token-2)'],
                failure: {
                    step: EnumNotificationStep.sendMulticast,
                    rawError: new Error(
                        'notification.queue.push.error.tokensPending'
                    ),
                },
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.push.error.tokensPending',
                { properties: { count: 2 } }
            );
        });

        it('returns the recorded tokens with the Error as the failure when the send rejects', async () => {
            const error = new Error('fcm');
            firebaseService.sendMulticast.mockRejectedValue(error);

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)'],
                payload,
                ['cipher(token-9)'],
                null
            );

            expect(sent).toEqual({
                encryptedFailureTokens: ['cipher(token-9)'],
                encryptedPendingTokens: null,
                failure: {
                    step: EnumNotificationStep.sendMulticast,
                    rawError: error,
                },
            });
            expect(sent.failure?.rawError).toBe(error);
        });

        it('wraps a non-Error rejection into an Error carrying its string form', async () => {
            firebaseService.sendMulticast.mockRejectedValue('boom');

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)'],
                payload,
                null,
                null
            );

            expect(sent.failure?.step).toBe(EnumNotificationStep.sendMulticast);
            expect(sent.failure?.rawError).toBeInstanceOf(Error);
            expect(sent.failure?.rawError.message).toBe('boom');
        });
    });

    describe('toStepSummary', () => {
        it('summarizes failed steps by step name only', () => {
            messageService.setMessage.mockImplementation(
                (path: string, options) =>
                    `${path}|${String(options?.properties?.steps)}`
            );

            expect(
                service.toStepSummary([
                    {
                        step: EnumNotificationStep.sendEmail,
                        rawError: new Error('prisma secret'),
                    },
                    {
                        step: EnumNotificationStep.sendPush,
                        rawError: new Error('boom'),
                    },
                ])
            ).toBe(
                `notification.queue.error.stepsFailed|${EnumNotificationStep.sendEmail}, ${EnumNotificationStep.sendPush}`
            );
        });
    });

    describe('stampSentInTx', () => {
        const tx: IDatabaseTransactionClient =
            mock<IDatabaseTransactionClient>();

        it('stamps sentAt on the push delivery row on the caller tx', async () => {
            notificationRepository.updateDeliverySentAtInTx.mockResolvedValue(
                true
            );

            await service.stampSentInTx(
                tx,
                'notification-id',
                ['token-1'],
                EnumNotificationPushProcess.send,
                'proceed-by-id'
            );

            expect(
                notificationRepository.updateDeliverySentAtInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                EnumNotificationChannel.push,
                TestPushStampedAt,
                ['token-1'],
                'proceed-by-id'
            );
        });

        it('throws an UnrecoverableError when no delivery row matches', async () => {
            notificationRepository.updateDeliverySentAtInTx.mockResolvedValue(
                false
            );

            await expect(
                service.stampSentInTx(
                    tx,
                    'notification-id',
                    [],
                    EnumNotificationPushProcess.send,
                    'proceed-by-id'
                )
            ).rejects.toMatchObject({
                constructor: UnrecoverableError,
                message: 'notification.queue.push.error.deliveryNotFound',
            });
        });
    });
});
