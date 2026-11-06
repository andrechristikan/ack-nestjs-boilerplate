import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPushDeliveryDomain } from '@modules/notification/domains/notification.push.delivery.domain';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { TestPushStampedAt } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UnrecoverableError } from 'bullmq';

describe('NotificationPushDeliveryDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let domain: NotificationPushDeliveryDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        helperDateService.create.mockReturnValue(TestPushStampedAt);
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushDeliveryDomain,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: MessageService, useValue: messageService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        domain = module.get(NotificationPushDeliveryDomain);
    });

    describe('stampProcessed', () => {
        it('stamps processedAt on the push delivery row', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                true
            );

            await domain.stampProcessed(
                'notification-id',
                EnumNotificationPushProcess.newDeviceLogin
            );

            expect(
                notificationRepository.updateDeliveryProcessedAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.push,
                TestPushStampedAt
            );
        });

        it('throws an UnrecoverableError naming the process when no delivery row matches', async () => {
            notificationRepository.updateDeliveryProcessedAt.mockResolvedValue(
                false
            );

            await expect(
                domain.stampProcessed(
                    'notification-id',
                    EnumNotificationPushProcess.newDeviceLogin
                )
            ).rejects.toMatchObject({
                constructor: UnrecoverableError,
                message: 'notification.queue.push.error.deliveryNotFound',
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.push.error.deliveryNotFound',
                {
                    properties: {
                        process: EnumNotificationPushProcess.newDeviceLogin,
                    },
                }
            );
        });
    });

    describe('stampSent', () => {
        it('stamps sentAt on the push delivery row with the failure tokens', async () => {
            notificationRepository.updateDeliverySentAt.mockResolvedValue(true);

            await domain.stampSent(
                'notification-id',
                ['token-1'],
                EnumNotificationPushProcess.workspaceInvite
            );

            expect(
                notificationRepository.updateDeliverySentAt
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationChannel.push,
                TestPushStampedAt,
                ['token-1']
            );
        });

        it('throws an UnrecoverableError naming the process when no delivery row matches', async () => {
            notificationRepository.updateDeliverySentAt.mockResolvedValue(
                false
            );

            await expect(
                domain.stampSent(
                    'notification-id',
                    [],
                    EnumNotificationPushProcess.workspaceInvite
                )
            ).rejects.toMatchObject({
                constructor: UnrecoverableError,
                message: 'notification.queue.push.error.deliveryNotFound',
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.push.error.deliveryNotFound',
                {
                    properties: {
                        process: EnumNotificationPushProcess.workspaceInvite,
                    },
                }
            );
        });
    });
});
