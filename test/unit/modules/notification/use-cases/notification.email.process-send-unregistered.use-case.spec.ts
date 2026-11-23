import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationEmailSendUnregisteredPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailDeliveryService } from '@modules/notification/services/notification.email.delivery.service';
import { NotificationEmailProcessSendUnregisteredUseCase } from '@modules/notification/use-cases/notification.email.process-send-unregistered.use-case';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationEmailProcessSendUnregisteredUseCase', () => {
    const notificationEmailDeliveryService: MockProxy<NotificationEmailDeliveryService> =
        mock<NotificationEmailDeliveryService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    let useCase: NotificationEmailProcessSendUnregisteredUseCase;

    const data: INotificationEmailSendUnregisteredPayload = {
        encryptedEmail: 'cipher(invitee@example.com)',
        context: {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Alice',
            reference: 'WI-ref',
            workspaceMemberRole: 'member',
            expiredAt: '2024-01-08T00:00:00.000Z',
            encryptedInviteAcceptLink:
                'cipher(https://app.test/sign-up?invite=token)',
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
                NotificationEmailProcessSendUnregisteredUseCase,
                NotificationUtil,
                {
                    provide: NotificationEmailDeliveryService,
                    useValue: notificationEmailDeliveryService,
                },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: AwsSESService, useValue: awsSESService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationEmailProcessSendUnregisteredUseCase);
    });

    describe('execute', () => {
        it('returns the sesNotInitialized message and sends nothing while SES is not initialized', async () => {
            awsSESService.isInitialized.mockReturnValue(false);

            const result = await useCase.execute(data);

            expect(result).toEqual({
                message: 'notification.queue.email.error.sesNotInitialized',
                result: null,
            });
            expect(
                notificationEmailDeliveryService.send
            ).not.toHaveBeenCalled();
        });

        it('sends the invite template with the contract template data, decrypted against the reference, and stamps no delivery', async () => {
            notificationEmailDeliveryService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await useCase.execute(data);

            expect(notificationEmailDeliveryService.send).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                'invitee@example.com',
                {
                    username: 'invitee@example.com',
                    workspaceName: 'Acme',
                    inviterName: 'Alice',
                    workspaceMemberRole: 'member',
                    inviteAcceptLink: 'https://app.test/sign-up?invite=token',
                    reference: 'WI-ref',
                    expiredAt: 'Mon, 08 Jan 2024 00:00:00 +0000',
                }
            );
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(invitee@example.com)',
                'secret-key',
                'notification.payload',
                'WI-ref'
            );
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(https://app.test/sign-up?invite=token)',
                'secret-key',
                'notification.payload',
                'WI-ref'
            );
            expect(
                notificationEmailDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailDeliveryService.stampSent
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.email.sendUnregistered',
                result: { $metadata: {}, MessageId: 'message-1' },
            });
        });
    });
});
