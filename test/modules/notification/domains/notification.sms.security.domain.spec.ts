import { AwsSNSService } from '@common/aws/services/aws.sns.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationSmsSecurityDomain } from '@modules/notification/domains/notification.sms.security.domain';
import { EnumNotificationSmsProcess } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';

describe('NotificationSmsSecurityDomain', () => {
    const sns = mock<AwsSNSService>();
    const messages = mock<MessageService>();
    const notificationRepository = mock<NotificationRepository>();
    const payload = {
        userId: 'user',
        notificationId: 'id',
        kind: EnumNotificationSmsProcess.newDeviceLogin,
        phoneNumber: '+111',
    };
    let domain: NotificationSmsSecurityDomain;
    beforeEach(async () => {
        vi.resetAllMocks();
        sns.isInitialized.mockReturnValue(true);
        sns.sendSms.mockResolvedValue({ MessageId: 'accepted', $metadata: {} });
        messages.setMessage.mockReturnValue('Security alert');
        notificationRepository.updateProcessAt.mockResolvedValue({
            title: 'Security alert',
            body: 'Security alert',
        });
        notificationRepository.updateSentAt.mockResolvedValue(undefined);
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsSecurityDomain,
                { provide: AwsSNSService, useValue: sns },
                { provide: MessageService, useValue: messages },
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
            ],
        }).compile();
        domain = module.get(NotificationSmsSecurityDomain);
    });
    it('sends the alert to the specified number', async () => {
        await domain.process(payload);
        expect(sns.sendSms).toHaveBeenCalledTimes(1);
        expect(sns.sendSms).toHaveBeenCalledWith({
            phoneNumber: '+111',
            message: 'Security alert',
        });
        expect(notificationRepository.updateProcessAt).toHaveBeenCalledWith(
            'user',
            'id',
            EnumNotificationChannel.sms
        );
        expect(notificationRepository.updateSentAt).toHaveBeenCalledWith(
            'user',
            'id',
            EnumNotificationChannel.sms,
            []
        );
    });

    it('skips SNS when the SMS delivery row does not exist', async () => {
        notificationRepository.updateProcessAt.mockResolvedValue(null);

        await domain.process(payload);

        expect(sns.sendSms).not.toHaveBeenCalled();
        expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
    });

    it('uses the same notification SMS delivery row for multiple recipients', async () => {
        await domain.process(payload);
        await domain.process({ ...payload, phoneNumber: '+222' });

        expect(notificationRepository.updateProcessAt).toHaveBeenNthCalledWith(
            1,
            'user',
            'id',
            EnumNotificationChannel.sms
        );
        expect(notificationRepository.updateProcessAt).toHaveBeenNthCalledWith(
            2,
            'user',
            'id',
            EnumNotificationChannel.sms
        );
    });
    it('propagates provider failures so BullMQ can retry', async () => {
        const error = new Error('unavailable');
        sns.sendSms.mockRejectedValue(error);
        await expect(domain.process(payload)).rejects.toBe(error);
        expect(notificationRepository.updateSentAt).not.toHaveBeenCalled();
    });
    it('skips when SNS is disabled or no number is provided', async () => {
        sns.isInitialized.mockReturnValue(false);
        await domain.process(payload);
        sns.isInitialized.mockReturnValue(true);
        await domain.process({ ...payload, phoneNumber: '' });
        expect(sns.sendSms).not.toHaveBeenCalled();
    });
});
