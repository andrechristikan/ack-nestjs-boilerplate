import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { MessageService } from '@common/message/services/message.service';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type {
    INotificationEmailBulkOutcome,
    INotificationEmailBulkQueuePayload,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationEmailProcessPublishTermPolicyUseCase } from '@modules/notification/use-cases/notification.email.process-publish-term-policy.use-case';
import type { ITermPolicyPublishPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRecipientService } from '@modules/term-policy/services/term-policy.recipient.service';

describe('NotificationEmailProcessPublishTermPolicyUseCase', () => {
    const termPolicyRecipientService: MockProxy<TermPolicyRecipientService> =
        mock<TermPolicyRecipientService>();
    const notificationEmailDeliveryService: MockProxy<NotificationEmailDeliveryService> =
        mock<NotificationEmailDeliveryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    let useCase: NotificationEmailProcessPublishTermPolicyUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2024-05-01T00:00:00.000Z');
    const message = 'notification.queue.email.publishTermPolicy';
    const data: ITermPolicyPublishPayload = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 2,
        recipientCutoffAt: '2024-01-01T00:00:00.000Z',
        resendNonce: null,
    };
    const recipients: INotificationTermPolicyBatchRecipientEncryptedPayload[] =
        [
            {
                userId: 'user-1',
                notificationId: 'notification-1',
                encryptedEmail: 'cipher(nadia@example.com)',
                username: 'nadia',
            },
            {
                userId: 'user-2',
                notificationId: 'notification-2',
                encryptedEmail: 'cipher(omar@example.com)',
                username: 'omar',
            },
        ];
    const payload: INotificationEmailBulkQueuePayload<ITermPolicyPublishPayload> =
        { data, batchId: 'batch-id', proceedBy: 'admin-id', recipients };
    const allSent: INotificationEmailBulkOutcome = {
        sentUserIds: ['user-1', 'user-2'],
        failedUserIds: [],
        unknownCount: 0,
    };

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        awsSESService.isInitialized.mockReturnValue(true);
        termPolicyRecipientService.claim.mockResolvedValue({
            claimNonce: 'claim-id',
            userIds: ['user-1', 'user-2'],
        });
        notificationEmailDeliveryService.sendPublishTermPolicy.mockResolvedValue(
            allSent
        );
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessPublishTermPolicyUseCase,
                {
                    provide: TermPolicyRecipientService,
                    useValue: termPolicyRecipientService,
                },
                {
                    provide: NotificationEmailDeliveryService,
                    useValue: notificationEmailDeliveryService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: AwsSESService, useValue: awsSESService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: MessageService, useValue: messageService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessPublishTermPolicyUseCase);
    });

    describe('execute', () => {
        it('returns the job message without claiming when SES is uninitialized', async () => {
            awsSESService.isInitialized.mockReturnValue(false);

            const result = await useCase.execute(payload);

            expect(result).toEqual({ message });
            expect(termPolicyRecipientService.claim).not.toHaveBeenCalled();
        });

        it('returns the job message and sends nothing when no recipient is claimed', async () => {
            termPolicyRecipientService.claim.mockResolvedValue({
                claimNonce: 'claim-id',
                userIds: [],
            });

            const result = await useCase.execute(payload);

            expect(termPolicyRecipientService.claim).toHaveBeenCalledWith(
                data.termPolicyId,
                'batch-id',
                ['user-1', 'user-2'],
                'admin-id'
            );
            expect(result).toEqual({ message });
            expect(
                notificationEmailDeliveryService.sendPublishTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('sends only the recipients the claim returned', async () => {
            termPolicyRecipientService.claim.mockResolvedValue({
                claimNonce: 'claim-id',
                userIds: ['user-2'],
            });

            await useCase.execute(payload);

            expect(
                notificationEmailDeliveryService.sendPublishTermPolicy
            ).toHaveBeenCalledWith(data, 'batch-id', [recipients[1]]);
        });

        it('marks the sent recipients and their notifications on one tx with one sent time', async () => {
            await useCase.execute(payload);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyRecipientService.markSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'claim-id',
                ['user-1', 'user-2'],
                now,
                'admin-id'
            );
            expect(notificationService.markEmailSentInTx).toHaveBeenCalledWith(
                tx,
                ['notification-1', 'notification-2'],
                now,
                'admin-id'
            );
        });

        it('opens no transaction and marks nothing when no recipient is sent', async () => {
            notificationEmailDeliveryService.sendPublishTermPolicy.mockResolvedValue(
                {
                    sentUserIds: [],
                    failedUserIds: ['user-1', 'user-2'],
                    unknownCount: 0,
                }
            );

            await useCase.execute(payload);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                termPolicyRecipientService.markSentInTx
            ).not.toHaveBeenCalled();
            expect(
                notificationService.markEmailSentInTx
            ).not.toHaveBeenCalled();
        });

        it('releases the failed recipients under the claim nonce', async () => {
            notificationEmailDeliveryService.sendPublishTermPolicy.mockResolvedValue(
                {
                    sentUserIds: ['user-1'],
                    failedUserIds: ['user-2'],
                    unknownCount: 0,
                }
            );

            await useCase.execute(payload);

            expect(termPolicyRecipientService.release).toHaveBeenCalledWith(
                'claim-id',
                ['user-2'],
                'admin-id'
            );
        });

        it('passes the send outcome and both settle outcomes to assertSettled', async () => {
            const markError = new Error('db down');
            termPolicyRecipientService.markSentInTx.mockRejectedValue(
                markError
            );

            await useCase.execute(payload);

            expect(
                notificationEmailDeliveryService.assertSettled
            ).toHaveBeenCalledWith(
                'batch-id',
                2,
                allSent,
                { status: 'rejected', reason: markError },
                { status: 'fulfilled', value: undefined }
            );
        });

        it('rethrows what assertSettled throws', async () => {
            const error = new Error('settled');
            notificationEmailDeliveryService.assertSettled.mockImplementation(
                () => {
                    throw error;
                }
            );

            await expect(useCase.execute(payload)).rejects.toBe(error);
        });

        it('returns the job message after a settled send', async () => {
            const result = await useCase.execute(payload);

            expect(result).toEqual({ message });
        });
    });
});
