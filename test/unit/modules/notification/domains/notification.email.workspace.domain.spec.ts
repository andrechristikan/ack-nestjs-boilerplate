import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { NotificationEmailWorkspaceDomain } from '@modules/notification/domains/notification.email.workspace.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';
import type {
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';

describe('NotificationEmailWorkspaceDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let domain: NotificationEmailWorkspaceDomain;

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
                NotificationEmailWorkspaceDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: MessageService, useValue: messageService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        domain = module.get(NotificationEmailWorkspaceDomain);
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

            const result = await domain.processWorkspaceInvite(
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
                message: 'Workspace invite email processed',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://invite.example.com');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processWorkspaceInvite(send, encrypted)
            ).rejects.toBe(error);
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

            const result = await domain.processWorkspaceInviteUnregistered(
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
                message: 'Workspace invite (unregistered) email processed',
            });
        });

        it('rethrows when SES rejects', async () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'https://invite.example.com'
            );
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processWorkspaceInviteUnregistered(
                    { encryptedEmail: 'cipher-email', cc: [], bcc: [] },
                    encrypted
                )
            ).rejects.toBe(error);
        });
    });

    describe('processWorkspaceJoinRequest', () => {
        const encrypted: INotificationWorkspaceJoinRequestEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
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

            const result = await domain.processWorkspaceJoinRequest(
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
                message: 'Workspace join request email processed',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://review.example.com');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processWorkspaceJoinRequest(send, encrypted)
            ).rejects.toBe(error);
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

            await domain.processWorkspaceJoinAccepted(send, data);

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
                domain.processWorkspaceJoinAccepted(send, data)
            ).rejects.toBe(error);
            expect(awsSESService.send).not.toHaveBeenCalled();
        });

        it('sends the email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processWorkspaceJoinAccepted(
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
                message: 'Workspace join accepted email processed',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processWorkspaceJoinAccepted(send, data)
            ).rejects.toBe(error);
        });
    });

    describe('processWorkspaceJoinRejected', () => {
        const data = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };

        it('resolves the reject reason label and sends the email with cc and bcc when present', async () => {
            messageService.setMessage.mockReturnValue('Workspace is full');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processWorkspaceJoinRejected(
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
                message: 'Workspace join rejected email processed',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            messageService.setMessage.mockReturnValue('Workspace is full');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processWorkspaceJoinRejected(send, data)
            ).rejects.toBe(error);
        });
    });
});
