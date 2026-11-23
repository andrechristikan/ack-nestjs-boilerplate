import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationEmailSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationEmailProcessSendUseCase } from '@modules/notification/use-cases/notification.email.process-send.use-case';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationEmailProcessSendUseCase', () => {
    const notificationEmailDeliveryService: MockProxy<NotificationEmailDeliveryService> =
        mock<NotificationEmailDeliveryService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    let useCase: NotificationEmailProcessSendUseCase;

    const data: INotificationEmailSendPayload = {
        kind: EnumNotificationKind.workspaceInvite,
        notificationId: 'notification-id',
        userId: 'user-id',
        username: 'invitee',
        encryptedEmail: 'cipher(invitee@example.com)',
        completedSteps: [],
        context: {
            userId: 'user-id',
            proceedBy: 'actor-id',
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Alice',
            reference: 'WI-ref',
            workspaceMemberRole: 'member',
            expiredAt: '2024-01-08T00:00:00.000Z',
            encryptedInviteAcceptLink: 'cipher(https://app.test/invite/token)',
            snapshot: null,
            verificationId: null,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        awsSESService.isInitialized.mockReturnValue(true);
        vi.mocked(configService.get).mockReturnValue('secret-key');
        stubCipherDecryption(helperEncryptionService);
        helperDateService.createFromIso.mockReturnValue(
            new Date('2024-01-08T00:00:00.000Z')
        );
        helperDateService.formatToRFC2822.mockReturnValue(
            'Mon, 08 Jan 2024 00:00:00 +0000'
        );
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailProcessSendUseCase,
                NotificationUtil,
                {
                    provide: NotificationEmailDeliveryService,
                    useValue: notificationEmailDeliveryService,
                },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: AwsSESService, useValue: awsSESService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessSendUseCase);
    });

    describe('execute', () => {
        it('returns the sesNotInitialized message and touches nothing while SES is not initialized', async () => {
            awsSESService.isInitialized.mockReturnValue(false);

            const result = await useCase.execute('outbox-id', data);

            expect(result).toEqual({
                message: 'notification.queue.email.error.sesNotInitialized',
                result: null,
            });
            expect(
                notificationEmailDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailDeliveryService.send
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(
                notificationEmailDeliveryService.stampSent
            ).not.toHaveBeenCalled();
        });

        it('stamps processed, sends the template named by the kind with the contract template data, then stamps sent', async () => {
            const callOrder: string[] = [];
            notificationEmailDeliveryService.stampProcessed.mockImplementation(
                async () => {
                    callOrder.push('processed');
                }
            );
            notificationEmailDeliveryService.send.mockImplementation(
                async () => {
                    callOrder.push('send');

                    return { $metadata: {}, MessageId: 'message-1' };
                }
            );
            outboxService.updateData.mockImplementation(async () => {
                callOrder.push('recorded');
            });
            notificationEmailDeliveryService.stampSent.mockImplementation(
                async () => {
                    callOrder.push('sent');
                }
            );

            const result = await useCase.execute('outbox-id', data);

            expect(callOrder).toEqual([
                'processed',
                'send',
                'recorded',
                'sent',
            ]);
            expect(
                notificationEmailDeliveryService.stampProcessed
            ).toHaveBeenCalledWith('notification-id', 'actor-id');
            expect(notificationEmailDeliveryService.send).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                'invitee@example.com',
                {
                    username: 'invitee',
                    workspaceName: 'Acme',
                    inviterName: 'Alice',
                    workspaceMemberRole: 'member',
                    inviteAcceptLink: 'https://app.test/invite/token',
                    reference: 'WI-ref',
                    expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
                }
            );
            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [EnumNotificationStep.sendEmail],
            });
            expect(
                notificationEmailDeliveryService.stampSent
            ).toHaveBeenCalledWith('notification-id', 'actor-id');
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(https://app.test/invite/token)',
                'secret-key',
                'notification.payload',
                'user-id'
            );
            expect(result).toEqual({
                message: 'notification.queue.email.send',
                result: { $metadata: {}, MessageId: 'message-1' },
            });
        });

        it('stamps no sent when the send fails', async () => {
            const failure = new Error('ses');
            notificationEmailDeliveryService.send.mockRejectedValue(failure);

            await expect(useCase.execute('outbox-id', data)).rejects.toBe(
                failure
            );

            expect(
                notificationEmailDeliveryService.stampSent
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
        });

        it('skips processed and the send on a retry that holds sendEmail, then stamps sent', async () => {
            const result = await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [EnumNotificationStep.sendEmail],
            });

            expect(
                notificationEmailDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailDeliveryService.send
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(
                notificationEmailDeliveryService.stampSent
            ).toHaveBeenCalledWith('notification-id', 'actor-id');
            expect(result).toEqual({
                message: 'notification.queue.email.send',
                result: null,
            });
        });
    });
});
