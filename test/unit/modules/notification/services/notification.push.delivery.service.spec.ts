import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import {
    buildSealedNotificationPayload,
    TestPushStampedAt,
} from '@test/unit/helpers/test.unit.notification-push.helper';
import { NotificationPushDeliveryNotFoundException } from '@modules/notification/exceptions/notification.push-delivery-not-found.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IFirebasePushResult } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

describe('NotificationPushDeliveryService', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const sealed = {
        token1: buildSealedNotificationPayload('token-1', 'user-id'),
        token2: buildSealedNotificationPayload('token-2', 'user-id'),
        token9: buildSealedNotificationPayload('token-9', 'user-id'),
        old: buildSealedNotificationPayload('old', 'user-id'),
    };
    let service: NotificationPushDeliveryService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(TestPushStampedAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushDeliveryService,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: MessageService, useValue: messageService },
                { provide: FirebaseService, useValue: firebaseService },
                NotificationUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
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

        it('throws a NotificationPushDeliveryNotFoundException naming the process when no delivery row matches', async () => {
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
                constructor: NotificationPushDeliveryNotFoundException,
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

        it('sends to the pending tokens when recorded and returns the outcome', async () => {
            firebaseService.sendMulticast.mockResolvedValue(emptyResult);

            const sent = await service.sendMulticast(
                'user-id',
                [sealed.token1, sealed.token2],
                payload,
                [],
                [sealed.token1]
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
                [sealed.token1, sealed.token2],
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
            await expect(
                service.sendMulticast(
                    'user-9',
                    [sealed.token1],
                    payload,
                    null,
                    null
                )
            ).rejects.toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
            });
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
                [sealed.token1, sealed.token2],
                payload,
                null,
                null
            );

            expect(sent).toEqual({
                encryptedFailureTokens: [sealed.token1],
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
                [sealed.token1, sealed.token2],
                payload,
                [sealed.old, sealed.token1],
                null
            );

            expect(sent.encryptedFailureTokens).toEqual([
                sealed.old,
                sealed.token1,
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
                [sealed.token1, sealed.token2],
                payload,
                null,
                null
            );

            expect(sent).toEqual({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [sealed.token1, sealed.token2],
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
                [sealed.token1],
                payload,
                [sealed.token9],
                null
            );

            expect(sent).toEqual({
                encryptedFailureTokens: [sealed.token9],
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
                [sealed.token1],
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
                        step: EnumNotificationStep.sendSms,
                        rawError: new Error('boom'),
                    },
                ])
            ).toBe(
                `notification.queue.push.error.stepsFailed|${EnumNotificationStep.sendEmail}, ${EnumNotificationStep.sendSms}`
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
                1,
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
                1,
                'proceed-by-id'
            );
        });

        it('throws a NotificationPushDeliveryNotFoundException when no delivery row matches', async () => {
            notificationRepository.updateDeliverySentAtInTx.mockResolvedValue(
                false
            );

            await expect(
                service.stampSentInTx(
                    tx,
                    'notification-id',
                    0,
                    EnumNotificationPushProcess.send,
                    'proceed-by-id'
                )
            ).rejects.toMatchObject({
                constructor: NotificationPushDeliveryNotFoundException,
                message: 'notification.queue.push.error.deliveryNotFound',
            });
        });
    });
});
