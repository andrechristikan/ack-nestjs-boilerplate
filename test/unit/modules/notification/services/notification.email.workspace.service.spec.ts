import { Test } from '@nestjs/testing';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import {
    expectEmailSentNotStamped,
    expectEmailStampOrder,
    stubEmailStampOrder,
} from '@test/unit/helpers/test.unit.notification-email.helper';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';
import type {
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';

describe('NotificationEmailWorkspaceService', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    let service: NotificationEmailWorkspaceService;

    const send = {
        userId: 'user-id',
        notificationId: 'notification-id',
        encryptedEmail: 'cipher(nadia@example.com)',
        username: 'nadia',
        cc: [],
        bcc: [],
    };
    const sendWithCcBcc = {
        ...send,
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'email.noreply': 'noreply@example.com',
                'email.support': 'support@example.com',
                'home.name': 'Home',
                'home.url': 'https://home.example.com',
                'app.encryptionSecretKey': 'secret-key',
            };

            return values[key];
        });
        helperDateService.createFromIso.mockImplementation(
            (iso: string) => new Date(iso)
        );
        helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
            date.toISOString()
        );
        stubCipherDecryption(helperEncryptionService);
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailWorkspaceService,
                { provide: AwsSESService, useValue: awsSESService },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: MessageService, useValue: messageService },
                NotificationUtil,
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        service = module.get(NotificationEmailWorkspaceService);
    });

    describe('processWorkspaceInvite', () => {
        const encrypted: INotificationWorkspaceInviteEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Nadia',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            encryptedInviteAcceptLink: 'cipher-link',
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };

        it('decrypts the invite link, formats the date, and sends the email', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://invite.example.com');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await service.processWorkspaceInvite(
                sendWithCcBcc,
                encrypted
            );

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                encrypted.encryptedInviteAcceptLink,
                'secret-key',
                'notification.payload',
                sendWithCcBcc.userId
            );
            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.workspaceInvite,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    workspaceName: encrypted.workspaceName,
                    inviterName: encrypted.inviterName,
                    workspaceMemberRole: encrypted.workspaceMemberRole,
                    inviteAcceptLink: 'https://invite.example.com',
                    reference: encrypted.reference,
                    expiredAt: encrypted.expiredAt,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.workspaceInvite',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://invite.example.com');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                service.processWorkspaceInvite(send, encrypted)
            ).rejects.toBe(error);
        });

        it('stamps the email delivery processed before the SES call and sent after it', async () => {
            const callOrder = stubEmailStampOrder(
                notificationRepository,
                awsSESService,
                helperDateService
            );

            await service.processWorkspaceInvite(send, encrypted);

            expectEmailStampOrder(
                notificationRepository,
                callOrder,
                send.notificationId
            );
        });

        it('stamps no sent time when SES rejects', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                true
            );
            awsSESService.send.mockRejectedValue(new Error('ses down'));

            await expect(
                service.processWorkspaceInvite(send, encrypted)
            ).rejects.toThrow('ses down');

            expectEmailSentNotStamped(notificationRepository);
        });
    });

    describe('processWorkspaceInviteUnregistered', () => {
        const encrypted: INotificationWorkspaceInviteEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Nadia',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            encryptedInviteAcceptLink: 'cipher-link',
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };

        it('decrypts the email and the invite link with the reference as context and sends the email with no cc or bcc', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('invitee@example.com')
                .mockReturnValueOnce('https://invite.example.com');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await service.processWorkspaceInviteUnregistered(
                { encryptedEmail: 'cipher-email', cc: [], bcc: [] },
                encrypted
            );

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher-email',
                'secret-key',
                'notification.payload',
                encrypted.reference
            );
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                encrypted.encryptedInviteAcceptLink,
                'secret-key',
                'notification.payload',
                encrypted.reference
            );
            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.workspaceInvite,
                recipients: ['invitee@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    workspaceName: encrypted.workspaceName,
                    inviterName: encrypted.inviterName,
                    workspaceMemberRole: encrypted.workspaceMemberRole,
                    inviteAcceptLink: 'https://invite.example.com',
                    reference: encrypted.reference,
                    expiredAt: encrypted.expiredAt,
                },
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.workspaceInviteUnregistered',
            });
        });

        it('rethrows when SES rejects', async () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'https://invite.example.com'
            );
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                service.processWorkspaceInviteUnregistered(
                    { encryptedEmail: 'cipher-email', cc: [], bcc: [] },
                    encrypted
                )
            ).rejects.toBe(error);
        });

        it('stamps no delivery because the invitee has no notification', async () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue('x');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            await service.processWorkspaceInviteUnregistered(
                { encryptedEmail: 'cipher-email', cc: [], bcc: [] },
                encrypted
            );

            expect(
                notificationRepository.updateDeliveryProcessedAt
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.updateDeliverySentAt
            ).not.toHaveBeenCalled();
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        const encrypted: INotificationWorkspaceJoinRequestEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
            joinRequestId: 'join-request-id',
            encryptedJoinRequestReviewLink: 'cipher-review-link',
        };

        it('decrypts the review link and sends the email', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://review.example.com');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await service.processWorkspaceJoinRequest(
                sendWithCcBcc,
                encrypted
            );

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                encrypted.encryptedJoinRequestReviewLink,
                'secret-key',
                'notification.payload',
                sendWithCcBcc.userId
            );
            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.workspaceJoinRequest,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    workspaceName: encrypted.workspaceName,
                    requesterName: encrypted.requesterName,
                    joinRequestReviewLink: 'https://review.example.com',
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.workspaceJoinRequest',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://review.example.com');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                service.processWorkspaceJoinRequest(send, encrypted)
            ).rejects.toBe(error);
        });

        it('stamps the email delivery processed before the SES call and sent after it', async () => {
            const callOrder = stubEmailStampOrder(
                notificationRepository,
                awsSESService,
                helperDateService
            );

            await service.processWorkspaceJoinRequest(send, encrypted);

            expectEmailStampOrder(
                notificationRepository,
                callOrder,
                send.notificationId
            );
        });

        it('stamps no sent time when SES rejects', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                true
            );
            awsSESService.send.mockRejectedValue(new Error('ses down'));

            await expect(
                service.processWorkspaceJoinRequest(send, encrypted)
            ).rejects.toThrow('ses down');

            expectEmailSentNotStamped(notificationRepository);
        });
    });

    describe('processWorkspaceJoinAccepted', () => {
        const data = { workspaceId: 'workspace-id', workspaceName: 'Acme' };

        it('decrypts the email with the user id before sending and sends to the plaintext', async () => {
            const callOrder: string[] = [];
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                callOrder.push('decrypt');

                return 'nadia@example.com';
            });
            awsSESService.send.mockImplementation(async () => {
                callOrder.push('send');

                return { $metadata: {}, MessageId: 'message-1' };
            });

            await service.processWorkspaceJoinAccepted(send, data);

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                send.encryptedEmail,
                'secret-key',
                'notification.payload',
                send.userId
            );
            expect(awsSESService.send).toHaveBeenCalledWith(
                expect.objectContaining({ recipients: ['nadia@example.com'] })
            );
            expect(callOrder).toEqual(['decrypt', 'send']);
        });

        it('rethrows a decryption failure without calling SES', async () => {
            const error = new HelperDecryptFailedException();
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw error;
            });

            await expect(
                service.processWorkspaceJoinAccepted(send, data)
            ).rejects.toBe(error);
            expect(awsSESService.send).not.toHaveBeenCalled();
        });

        it('sends the email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await service.processWorkspaceJoinAccepted(
                sendWithCcBcc,
                data
            );

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.workspaceJoinAccepted,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    workspaceName: data.workspaceName,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.workspaceJoinAccepted',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                service.processWorkspaceJoinAccepted(send, data)
            ).rejects.toBe(error);
        });

        it('stamps the email delivery processed before the SES call and sent after it', async () => {
            const callOrder = stubEmailStampOrder(
                notificationRepository,
                awsSESService,
                helperDateService
            );

            await service.processWorkspaceJoinAccepted(send, data);

            expectEmailStampOrder(
                notificationRepository,
                callOrder,
                send.notificationId
            );
        });

        it('stamps no sent time when SES rejects', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                true
            );
            awsSESService.send.mockRejectedValue(new Error('ses down'));

            await expect(
                service.processWorkspaceJoinAccepted(send, data)
            ).rejects.toThrow('ses down');

            expectEmailSentNotStamped(notificationRepository);
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        const data = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };

        it('resolves the reject reason label and sends the email with cc and bcc when present', async () => {
            messageService.setMessage.mockImplementation((path: string) =>
                path.startsWith('notification.rejectReason')
                    ? 'Workspace is full'
                    : path
            );
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await service.processWorkspaceJoinRejected(
                sendWithCcBcc,
                data
            );

            expect(messageService.setMessage).toHaveBeenCalledWith(
                `notification.rejectReason.${data.rejectReasonCode}`
            );
            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.workspaceJoinRejected,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    workspaceName: data.workspaceName,
                    rejectReasonLabel: 'Workspace is full',
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.workspaceJoinRejected',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            messageService.setMessage.mockImplementation((path: string) =>
                path.startsWith('notification.rejectReason')
                    ? 'Workspace is full'
                    : path
            );
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                service.processWorkspaceJoinRejected(send, data)
            ).rejects.toBe(error);
        });

        it('stamps the email delivery processed before the SES call and sent after it', async () => {
            const callOrder = stubEmailStampOrder(
                notificationRepository,
                awsSESService,
                helperDateService
            );

            await service.processWorkspaceJoinRejected(send, data);

            expectEmailStampOrder(
                notificationRepository,
                callOrder,
                send.notificationId
            );
        });

        it('stamps no sent time when SES rejects', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                true
            );
            awsSESService.send.mockRejectedValue(new Error('ses down'));

            await expect(
                service.processWorkspaceJoinRejected(send, data)
            ).rejects.toThrow('ses down');

            expectEmailSentNotStamped(notificationRepository);
        });
    });
});
