import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { flatten } from 'flat';
import { NotificationEmailSecurityDomain } from '@modules/notification/domains/notification.email.security.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { stubCipherDecryption } from '@test/unit/helpers/test.unit.notification-push.helper';
import type { INotificationNewDeviceLoginPayload } from '@modules/notification/interfaces/notification.interface';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationEmailSecurityDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let domain: NotificationEmailSecurityDomain;

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
                { provide: MessageService, useValue: messageService },
                NotificationEmailSecurityDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        domain = module.get(NotificationEmailSecurityDomain);
    });

    describe('processTemporaryPasswordByAdmin', () => {
        const encrypted = {
            encryptedPassword: 'cipher-password',
            passwordExpiredAt: '2024-02-01T00:00:00.000Z',
            passwordCreatedAt: '2024-01-01T00:00:00.000Z',
        };

        it('decrypts the password, formats the dates, and sends the email', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('plain-password');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processTemporaryPasswordByAdmin(
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
                templateName: EnumNotificationProcess.temporaryPasswordByAdmin,
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
                message: 'notification.queue.email.temporaryPasswordByAdmin',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('plain-password');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processTemporaryPasswordByAdmin(send, encrypted)
            ).rejects.toBe(error);
        });
    });

    describe('processChangePassword', () => {
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

            await domain.processChangePassword(send);

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

            await expect(domain.processChangePassword(send)).rejects.toBe(
                error
            );
            expect(awsSESService.send).not.toHaveBeenCalled();
        });

        it('sends the change password email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processChangePassword(sendWithCcBcc);

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.changePassword,
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
                message: 'notification.queue.email.changePassword',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(domain.processChangePassword(send)).rejects.toBe(
                error
            );
        });
    });

    describe('processResetPassword', () => {
        it('sends the reset password email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processResetPassword(sendWithCcBcc);

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.resetPassword,
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
                message: 'notification.queue.email.resetPassword',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(domain.processResetPassword(send)).rejects.toBe(error);
        });
    });

    describe('processForgotPassword', () => {
        const encrypted = {
            expiredAt: '2024-02-01T00:00:00.000Z',
            encryptedLink: 'cipher-link',
            reference: 'ref-1',
            expiredInMinutes: 15,
            resendInMinutes: 5,
        };

        it('decrypts the link, formats the date, and sends the email', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://reset.example.com');
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processForgotPassword(
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
                templateName: EnumNotificationProcess.forgotPassword,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    link: 'https://reset.example.com',
                    expiredAt: encrypted.expiredAt,
                    reference: encrypted.reference,
                    expiredInMinutes: '15',
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.forgotPassword',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            helperEncryptionService.aes256Decrypt
                .mockReturnValueOnce('nadia@example.com')
                .mockReturnValue('https://reset.example.com');
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processForgotPassword(send, encrypted)
            ).rejects.toBe(error);
        });
    });

    describe('processResetTwoFactorByAdmin', () => {
        it('sends the reset two-factor email with cc and bcc when present', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result =
                await domain.processResetTwoFactorByAdmin(sendWithCcBcc);

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.resetTwoFactorByAdmin,
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
                message: 'notification.queue.email.resetTwoFactorByAdmin',
            });
        });

        it('rethrows when SES rejects, with no cc or bcc present', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(
                domain.processResetTwoFactorByAdmin(send)
            ).rejects.toBe(error);
        });
    });

    describe('processNewDeviceLogin', () => {
        const requestLog: IRequestLog = {
            userAgent: {
                ua: 'Mozilla/5.0',
                browser: {
                    name: 'Chrome',
                    version: '120',
                    major: '120',
                    type: null,
                },
                cpu: { architecture: 'amd64' },
                device: { type: 'desktop', vendor: null, model: null },
                engine: { name: 'Blink', version: '120' },
                os: { name: 'macOS', version: '14' },
            },
            ipAddress: '203.0.113.5',
            geoLocation: {
                latitude: 37.7749,
                longitude: -122.4194,
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
            },
        };
        const data: INotificationNewDeviceLoginPayload = {
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            loginAt: '2024-01-01T00:00:00.000Z',
            requestLog,
        };

        it('flattens the user agent and sends the email', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            const result = await domain.processNewDeviceLogin(
                sendWithCcBcc,
                data
            );

            expect(awsSESService.send).toHaveBeenCalledWith({
                templateName: EnumNotificationProcess.newDeviceLogin,
                recipients: ['nadia@example.com'],
                sender: 'noreply@example.com',
                templateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    username: sendWithCcBcc.username,
                    loginFrom: data.loginFrom,
                    loginWith: data.loginWith,
                    loginAt: data.loginAt,
                    userAgent: flatten(requestLog.userAgent),
                    ipAddress: '203.0.113.5',
                },
                cc: sendWithCcBcc.cc,
                bcc: sendWithCcBcc.bcc,
            });
            expect(result).toMatchObject({
                message: 'notification.queue.email.newDeviceLogin',
            });
        });

        it('defaults ipAddress to an empty string when null', async () => {
            awsSESService.send.mockResolvedValue({
                $metadata: {},
                MessageId: 'message-1',
            });

            await domain.processNewDeviceLogin(send, {
                ...data,
                requestLog: { ...data.requestLog, ipAddress: null },
            });

            expect(awsSESService.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    templateData: expect.objectContaining({ ipAddress: '' }),
                })
            );
        });

        it('rethrows when SES rejects', async () => {
            const error = new Error('ses down');
            awsSESService.send.mockRejectedValue(error);

            await expect(domain.processNewDeviceLogin(send, data)).rejects.toBe(
                error
            );
        });
    });
});
