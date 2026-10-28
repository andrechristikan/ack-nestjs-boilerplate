import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationEmailAccountDomain } from '@modules/notification/domains/notification.email.account.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationEmailAccountDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let domain: NotificationEmailAccountDomain;

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
        stubCipherDecryption(helperEncryptionService);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationEmailAccountDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        domain = module.get(NotificationEmailAccountDomain);
    });

    describe('processWelcome', () => {
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

            await domain.processWelcome(send);

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

            await expect(domain.processWelcome(send)).rejects.toBe(error);
            expect(awsSESService.send).not.toHaveBeenCalled();
        });

        it('sends the welcome email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processWelcome(sendWithCcBcc);

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.welcome,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.welcome',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(domain.processWelcome(send)).rejects.toBe(error);
            expect(awsSESService.send).toHaveBeenCalledWith(
                expect.not.objectContaining({ cc: expect.anything() })
            );
        });
    });

    describe('processWelcomeSocial', () => {
        it('sends the welcome social email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processWelcomeSocial(sendWithCcBcc);

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.welcomeSocial,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.welcomeSocial',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(domain.processWelcomeSocial(send)).rejects.toBe(error);
        });
    });

    describe('processWelcomeByAdmin', () => {
        const encrypted = {
            encryptedPassword: 'cipher-password',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('decrypts the password, formats the dates, and sends the email', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('plain-password');
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processWelcomeByAdmin(
                sendWithCcBcc,
                encrypted
            );

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                encrypted.encryptedPassword,
                'secret-key',
                'notification.payload',
                sendWithCcBcc.userId
            );
            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.welcomeByAdmin,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    password: 'plain-password',
                    passwordExpiredAt: encrypted.passwordExpiredAt,
                    passwordCreatedAt: encrypted.passwordCreatedAt,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.welcomeByAdmin',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('plain-password');
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processWelcomeByAdmin(send, encrypted)
            ).rejects.toBe(error);
        });
    });

    describe('processVerificationEmail', () => {
        const encrypted = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            reference: 'ref-1',
            encryptedLink: 'cipher-link',
            expiredInMinutes: 30,
        };

        it('decrypts the link, formats the date, and sends the email', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://verify.example.com');
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processVerificationEmail(
                sendWithCcBcc,
                encrypted
            );

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                encrypted.encryptedLink,
                'secret-key',
                'notification.payload',
                sendWithCcBcc.userId
            );
            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.verificationEmail,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    link: 'https://verify.example.com',
                    reference: encrypted.reference,
                    expiredAt: encrypted.expiredAt,
                    expiredInMinutes: '30',
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.verificationEmail',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://verify.example.com');
            helperDateService.createFromIso.mockImplementation(
                (iso: string) => new Date(iso)
            );
            helperDateService.formatToRFC2822.mockImplementation((date: Date) =>
                date.toISOString()
            );
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processVerificationEmail(send, encrypted)
            ).rejects.toBe(error);
        });
    });

    describe('processVerifiedEmail', () => {
        const data = { reference: 'ref-1' };

        it('sends the verified email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processVerifiedEmail(
                sendWithCcBcc,
                data
            );

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.verifiedEmail,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    reference: data.reference,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.verifiedEmail',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(domain.processVerifiedEmail(send, data)).rejects.toBe(
                error
            );
        });
    });

    describe('processVerifiedMobileNumber', () => {
        const data = {
            reference: 'ref-1',
            mobileNumber: '+1555****567',
            resendInMinutes: 5,
        };

        it('sends the verified mobile number email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processVerifiedMobileNumber(
                sendWithCcBcc,
                data
            );

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.verifiedMobileNumber,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    reference: data.reference,
                    mobileNumber: data.mobileNumber,
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.verifiedMobileNumber',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processVerifiedMobileNumber(send, data)
            ).rejects.toBe(error);
        });
    });
});
