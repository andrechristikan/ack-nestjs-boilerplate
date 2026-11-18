import { AwsSNSService } from '@common/aws/services/aws.sns.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationSmsAccountDomain } from '@modules/notification/domains/notification.sms.account.domain';
import type { INotificationSendSmsVerificationPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';

describe('NotificationSmsAccountDomain', () => {
    const sns = mock<AwsSNSService>();
    const messages = mock<MessageService>();
    const notificationRepository = mock<NotificationRepository>();
    const userMobileNumberDomain = mock<UserMobileNumberDomain>();
    const configService = mock<ConfigService>();
    const helperEncryptionService = mock<HelperEncryptionService>();
    const payload: INotificationSendSmsVerificationPayload = {
        userId: 'user',
        notificationId: 'id',
        phoneNumber: '+111',
        encryptedOtp: 'cipher',
        expiredInMinutes: 5,
        mobileNumberId: 'mobile-id',
        reference: 'current-reference',
    };
    let domain: NotificationSmsAccountDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) =>
            key === 'app.encryptionSecretKey' ? 'secret-key' : undefined
        );
        sns.isInitialized.mockReturnValue(true);
        sns.sendSms.mockResolvedValue({ MessageId: 'accepted', $metadata: {} });
        messages.setMessage.mockReturnValue('Your verification code is 123456');
        helperEncryptionService.aes256Decrypt.mockReturnValue('123456');
        notificationRepository.updateProcessAt.mockResolvedValue({
            title: 't',
            body: 'b',
        });
        notificationRepository.updateSentAt.mockResolvedValue(undefined);
        userMobileNumberDomain.isActiveVerification.mockResolvedValue(true);
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsAccountDomain,
                { provide: AwsSNSService, useValue: sns },
                { provide: MessageService, useValue: messages },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                {
                    provide: UserMobileNumberDomain,
                    useValue: userMobileNumberDomain,
                },
            ],
        }).compile();
        domain = module.get(NotificationSmsAccountDomain);
    });

    describe('processVerificationMobileNumber', () => {
        it('skips a code replaced by a newer verification', async () => {
            userMobileNumberDomain.isActiveVerification.mockResolvedValue(
                false
            );

            const result =
                await domain.processVerificationMobileNumber(payload);

            expect(result.message).toContain('skipped');
            expect(sns.sendSms).not.toHaveBeenCalled();
        });

        it('skips a code whose verification is no longer active', async () => {
            userMobileNumberDomain.isActiveVerification.mockResolvedValue(
                false
            );

            const result =
                await domain.processVerificationMobileNumber(payload);

            expect(result.message).toContain('skipped');
            expect(sns.sendSms).not.toHaveBeenCalled();
        });

        it('skips when SNS is not initialized', async () => {
            sns.isInitialized.mockReturnValue(false);

            const result =
                await domain.processVerificationMobileNumber(payload);

            expect(result).toEqual({ message: 'SMS notification skipped' });
            expect(
                notificationRepository.updateProcessAt
            ).not.toHaveBeenCalled();
            expect(
                helperEncryptionService.aes256Decrypt
            ).not.toHaveBeenCalled();
        });

        it('skips when the notification row is missing', async () => {
            notificationRepository.updateProcessAt.mockResolvedValue(null);

            const result =
                await domain.processVerificationMobileNumber(payload);

            expect(result).toEqual({
                message: 'Notification not found, skipping SMS notification',
            });
            expect(sns.sendSms).not.toHaveBeenCalled();
            expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
        });

        it('decrypts the otp and sends the rendered message', async () => {
            const result =
                await domain.processVerificationMobileNumber(payload);

            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher',
                'secret-key',
                NotificationPayloadEncryptionPurpose,
                'user'
            );
            expect(messages.setMessage).toHaveBeenCalledWith(
                'notification.sms.verificationMobileNumber',
                { properties: { otp: '123456', expiredInMinutes: 5 } }
            );
            expect(notificationRepository.updateProcessAt).toHaveBeenCalledWith(
                'user',
                'id',
                EnumNotificationChannel.sms
            );
            expect(sns.sendSms).toHaveBeenCalledWith({
                phoneNumber: '+111',
                message: 'Your verification code is 123456',
            });
            expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
                'user',
                'id',
                EnumNotificationChannel.sms,
                []
            );
            expect(JSON.stringify(result)).not.toContain('123456');
        });

        it('propagates provider failures without marking sent', async () => {
            const error = new Error('unavailable');
            sns.sendSms.mockRejectedValue(error);

            await expect(
                domain.processVerificationMobileNumber(payload)
            ).rejects.toBe(error);
            expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
        });
    });
});
