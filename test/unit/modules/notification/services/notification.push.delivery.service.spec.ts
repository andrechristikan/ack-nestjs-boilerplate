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
        const pairs = [{ encrypted: 'cipher(token-1)', token: 'token-1' }];
        const payload = { title: 'Title', body: 'Body' };

        it('sends to the pending tokens when recorded and returns the outcome', async () => {
            const outcome = {
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            };
            const result: IFirebasePushResult = {
                successCount: 1,
                failureCount: 0,
                failureTokens: [],
                retryTokens: [],
            };
            notificationUtil.toTokenPairs.mockReturnValue(pairs);
            firebaseService.sendMulticast.mockResolvedValue(result);
            notificationUtil.toMulticastOutcome.mockReturnValue(outcome);

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                payload,
                [],
                ['cipher(token-1)']
            );

            expect(notificationUtil.toTokenPairs).toHaveBeenCalledWith(
                'user-id',
                ['cipher(token-1)']
            );
            expect(firebaseService.sendMulticast).toHaveBeenCalledWith(
                ['token-1'],
                payload
            );
            expect(notificationUtil.toMulticastOutcome).toHaveBeenCalledWith(
                pairs,
                result,
                []
            );
            expect(sent).toBe(outcome);
        });

        it('sends to every token when none is pending', async () => {
            notificationUtil.toTokenPairs.mockReturnValue(pairs);

            await service.sendMulticast(
                'user-id',
                ['cipher(token-1)'],
                payload,
                null,
                null
            );

            expect(notificationUtil.toTokenPairs).toHaveBeenCalledWith(
                'user-id',
                ['cipher(token-1)']
            );
        });

        it('returns the recorded tokens with the failure when the send rejects', async () => {
            const error = new Error('fcm');
            const failure = {
                step: EnumNotificationStep.sendMulticast,
                rawError: error,
            };
            notificationUtil.toTokenPairs.mockReturnValue(pairs);
            firebaseService.sendMulticast.mockRejectedValue(error);
            notificationUtil.toStepFailure.mockReturnValue(failure);

            const sent = await service.sendMulticast(
                'user-id',
                ['cipher(token-1)'],
                payload,
                ['cipher(token-9)'],
                null
            );

            expect(notificationUtil.toStepFailure).toHaveBeenCalledWith(
                EnumNotificationStep.sendMulticast,
                error
            );
            expect(sent).toEqual({
                encryptedFailureTokens: ['cipher(token-9)'],
                encryptedPendingTokens: null,
                failure,
            });
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
