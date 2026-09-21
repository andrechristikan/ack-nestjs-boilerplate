import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationEmailSecurityDomain } from '@modules/notification/domains/notification.email.security.domain';
import type {
    INotificationEmailSendPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';

describe('NotificationEmailSecurityDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const payload = mock<INotificationEmailSendPayload>({
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
        notificationId: 'notification-id',
    });
    const temporary = mock<INotificationTemporaryPasswordEncryptedPayload>({
        encryptedPassword: 'password-ciphertext',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
        passwordExpiredAt: '2026-02-01T00:00:00.000Z',
    });
    const forgot = mock<INotificationForgotPasswordEncryptedPayload>({
        encryptedLink: 'link-ciphertext',
        expiredAt: '2026-01-01T01:00:00.000Z',
        reference: 'FP-REF',
        expiredInMinutes: 60,
    });
    const newDevice = mock<INotificationNewDeviceLoginPayload>({
        loginAt: '2026-01-01T00:00:00.000Z',
        requestLog: {
            userAgent: { ua: 'browser' },
            geoLocation: null,
            ipAddress: '127.0.0.1',
        },
    });
    const cases = [
        [
            'temporary password',
            (p: INotificationEmailSendPayload) =>
                service.processTemporaryPasswordByAdmin(p, temporary),
        ],
        [
            'change password',
            (p: INotificationEmailSendPayload) =>
                service.processChangePassword(p),
        ],
        [
            'reset password',
            (p: INotificationEmailSendPayload) =>
                service.processResetPassword(p),
        ],
        [
            'forgot password',
            (p: INotificationEmailSendPayload) =>
                service.processForgotPassword(p, forgot),
        ],
        [
            'reset two-factor',
            (p: INotificationEmailSendPayload) =>
                service.processResetTwoFactorByAdmin(p),
        ],
        [
            'new device login',
            (p: INotificationEmailSendPayload) =>
                service.processNewDeviceLogin(p, newDevice),
        ],
    ] as const;
    let service: NotificationEmailSecurityDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'email.noreply': 'no-reply@example.com',
                        'email.support': 'support@example.com',
                        'home.name': 'ACK',
                        'home.url': 'https://example.com',
                        'app.encryptionSecretKey': 'root-secret',
                    })[String(key)]
            )
        );
        helperEncryptionService.aes256Decrypt.mockReturnValue('plaintext');
        helperDateService.createFromIso.mockReturnValue(
            new Date('2026-01-01T00:00:00.000Z')
        );
        helperDateService.formatToRFC2822.mockReturnValue(
            'Thu, 01 Jan 2026 00:00:00 GMT'
        );
        awsSESService.send.mockResolvedValue({
            $metadata: {},
            MessageId: 'message-id',
        });
        service = new NotificationEmailSecurityDomain(
            awsSESService,
            configService,
            helperDateService,
            helperEncryptionService
        );
    });

    it.each(cases)(
        'sends %s with and without optional recipient lists',
        async (_name, process) => {
            await expect(process(payload)).resolves.toEqual(
                expect.objectContaining({
                    result: expect.objectContaining({
                        MessageId: 'message-id',
                    }),
                })
            );
            expect(awsSESService.send).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    cc: expect.anything(),
                    bcc: expect.anything(),
                })
            );
            await process({
                ...payload,
                cc: ['cc@example.com'],
                bcc: ['bcc@example.com'],
            });
            expect(awsSESService.send).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    cc: ['cc@example.com'],
                    bcc: ['bcc@example.com'],
                })
            );
        }
    );

    it.each(cases)(
        'rethrows provider failure for %s',
        async (_name, process) => {
            const error = new Error('SES down');
            awsSESService.send.mockRejectedValue(error);
            await expect(process(payload)).rejects.toBe(error);
        }
    );

    it('decrypts credentials and links with user-bound context', async () => {
        await service.processTemporaryPasswordByAdmin(payload, temporary);
        await service.processForgotPassword(payload, forgot);
        expect(helperEncryptionService.aes256Decrypt).toHaveBeenNthCalledWith(
            1,
            'password-ciphertext',
            'root-secret',
            NotificationPayloadEncryptionPurpose,
            payload.userId
        );
        expect(helperEncryptionService.aes256Decrypt).toHaveBeenNthCalledWith(
            2,
            'link-ciphertext',
            'root-secret',
            NotificationPayloadEncryptionPurpose,
            payload.userId
        );
        expect(awsSESService.send).toHaveBeenLastCalledWith(
            expect.objectContaining({
                templateData: expect.objectContaining({ link: 'plaintext' }),
            })
        );
    });

    it('renders an empty IP address when the request log has no address', async () => {
        await service.processNewDeviceLogin(payload, {
            ...newDevice,
            requestLog: { ...newDevice.requestLog, ipAddress: null },
        });

        expect(awsSESService.send).toHaveBeenCalledWith(
            expect.objectContaining({
                templateData: expect.objectContaining({ ipAddress: '' }),
            })
        );
    });
});
