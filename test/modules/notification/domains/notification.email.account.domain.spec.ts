import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationEmailAccountDomain } from '@modules/notification/domains/notification.email.account.domain';
import type { INotificationEmailSendPayload } from '@modules/notification/interfaces/notification.interface';

describe('NotificationEmailAccountDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const basePayload = mock<INotificationEmailSendPayload>({
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
        notificationId: 'notification-id',
    });
    const welcomeByAdmin = {
        encryptedPassword: 'ciphertext',
        passwordCreatedAt: '2026-01-01T00:00:00.000Z',
        passwordExpiredAt: '2026-02-01T00:00:00.000Z',
    };
    const verification = {
        encryptedLink: 'ciphertext',
        expiredAt: '2026-01-01T01:00:00.000Z',
        reference: 'VE-REF',
        expiredInMinutes: 60,
    };
    const cases = [
        [
            'welcome',
            (payload: INotificationEmailSendPayload) =>
                service.processWelcome(payload),
        ],
        [
            'social welcome',
            (payload: INotificationEmailSendPayload) =>
                service.processWelcomeSocial(payload),
        ],
        [
            'administrator welcome',
            (payload: INotificationEmailSendPayload) =>
                service.processWelcomeByAdmin(payload, welcomeByAdmin),
        ],
        [
            'verification',
            (payload: INotificationEmailSendPayload) =>
                service.processVerificationEmail(payload, verification),
        ],
        [
            'verified email',
            (payload: INotificationEmailSendPayload) =>
                service.processVerifiedEmail(payload, { reference: 'VE-REF' }),
        ],
        [
            'verified mobile',
            (payload: INotificationEmailSendPayload) =>
                service.processVerifiedMobileNumber(payload, {
                    reference: 'VE-REF',
                    mobileNumber: '+3900000000',
                    resendInMinutes: 5,
                }),
        ],
    ] as const;
    let service: NotificationEmailAccountDomain;

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
        service = new NotificationEmailAccountDomain(
            awsSESService,
            configService,
            helperDateService,
            helperEncryptionService
        );
    });

    it.each(cases)(
        'sends %s without optional recipient lists',
        async (_name, process) => {
            const result = await process(basePayload);
            expect(result.result).toEqual(
                expect.objectContaining({ MessageId: 'message-id' })
            );
            expect(awsSESService.send).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    cc: expect.anything(),
                    bcc: expect.anything(),
                })
            );
        }
    );

    it.each(cases)(
        'sends %s with cc and bcc recipients',
        async (_name, process) => {
            await process({
                ...basePayload,
                cc: ['cc@example.com'],
                bcc: ['bcc@example.com'],
            });
            expect(awsSESService.send).toHaveBeenCalledWith(
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
            await expect(process(basePayload)).rejects.toBe(error);
        }
    );

    it('decrypts sensitive account values only for template data', async () => {
        await service.processWelcomeByAdmin(basePayload, welcomeByAdmin);
        await service.processVerificationEmail(basePayload, verification);
        expect(helperEncryptionService.aes256Decrypt).toHaveBeenNthCalledWith(
            1,
            'ciphertext',
            'root-secret',
            NotificationPayloadEncryptionPurpose,
            basePayload.userId
        );
        expect(helperEncryptionService.aes256Decrypt).toHaveBeenNthCalledWith(
            2,
            'ciphertext',
            'root-secret',
            NotificationPayloadEncryptionPurpose,
            basePayload.userId
        );
        expect(awsSESService.send).toHaveBeenLastCalledWith(
            expect.objectContaining({
                templateData: expect.objectContaining({ link: 'plaintext' }),
            })
        );
    });
});
