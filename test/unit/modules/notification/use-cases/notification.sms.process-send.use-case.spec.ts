import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationSmsSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationSmsDeliveryService } from '@modules/notification/services/notification.sms.delivery.service';
import { NotificationSmsProcessSendUseCase } from '@modules/notification/use-cases/notification.sms.process-send.use-case';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { buildSealedNotificationPayload } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationSmsProcessSendUseCase', () => {
    const notificationSmsDeliveryService: MockProxy<NotificationSmsDeliveryService> =
        mock<NotificationSmsDeliveryService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    let useCase: NotificationSmsProcessSendUseCase;

    const data: INotificationSmsSendPayload = {
        kind: EnumNotificationKind.verificationMobileNumber,
        notificationId: 'notification-id',
        userId: 'user-id',
        username: 'invitee',
        encryptedMobileNumber: buildSealedNotificationPayload(
            '+6281234567890',
            'user-id'
        ),
        completedSteps: [],
        context: {
            userId: 'user-id',
            proceedBy: 'user-id',
            verificationId: 'verification-id',
            reference: 'VRF-abc',
            expiredInMinutes: 5,
            encryptedOtp: buildSealedNotificationPayload('482913', 'user-id'),
            snapshot: null,
        },
    };

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsProcessSendUseCase,
                NotificationUtil,
                {
                    provide: NotificationSmsDeliveryService,
                    useValue: notificationSmsDeliveryService,
                },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationSmsProcessSendUseCase);
    });

    describe('execute', () => {
        it('stamps processed, decrypts the number and the code, sends the filled body once, records the step, then stamps sent', async () => {
            const callOrder: string[] = [];
            notificationSmsDeliveryService.stampProcessed.mockImplementation(
                async () => {
                    callOrder.push('processed');
                }
            );
            notificationSmsDeliveryService.send.mockImplementation(async () => {
                callOrder.push('send');
            });
            outboxService.updateData.mockImplementation(async () => {
                callOrder.push('recorded');
            });
            notificationSmsDeliveryService.stampSent.mockImplementation(
                async () => {
                    callOrder.push('sent');
                }
            );
            messageService.setMessage.mockImplementation((path: string) =>
                path === 'notification.sms.verificationMobileNumber'
                    ? 'sms body'
                    : path
            );

            const result = await useCase.execute('outbox-id', data);

            expect(callOrder).toEqual([
                'processed',
                'send',
                'recorded',
                'sent',
            ]);
            expect(
                notificationSmsDeliveryService.stampProcessed
            ).toHaveBeenCalledWith('notification-id', 'user-id');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.sms.verificationMobileNumber',
                {
                    properties: {
                        username: 'invitee',
                        otp: '482913',
                        reference: 'VRF-abc',
                        expiredInMinutes: '5',
                    },
                }
            );
            expect(notificationSmsDeliveryService.send).toHaveBeenCalledTimes(
                1
            );
            expect(notificationSmsDeliveryService.send).toHaveBeenCalledWith(
                EnumNotificationKind.verificationMobileNumber,
                '+6281234567890',
                'sms body'
            );
            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [EnumNotificationStep.sendSms],
            });
            expect(
                notificationSmsDeliveryService.stampSent
            ).toHaveBeenCalledWith('notification-id', 'user-id');
            expect(result).toEqual({
                message: 'notification.queue.sms.send',
            });
        });

        it('stamps no sent when the send fails', async () => {
            const failure = new Error('provider');
            notificationSmsDeliveryService.send.mockRejectedValue(failure);

            await expect(useCase.execute('outbox-id', data)).rejects.toBe(
                failure
            );

            expect(
                notificationSmsDeliveryService.stampSent
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
        });

        it('skips processed and the send on a retry that holds sendSms, then stamps sent', async () => {
            const result = await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [EnumNotificationStep.sendSms],
            });

            expect(
                notificationSmsDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(notificationSmsDeliveryService.send).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(
                notificationSmsDeliveryService.stampSent
            ).toHaveBeenCalledWith('notification-id', 'user-id');
            expect(result).toEqual({ message: 'notification.queue.sms.send' });
        });
    });
});
