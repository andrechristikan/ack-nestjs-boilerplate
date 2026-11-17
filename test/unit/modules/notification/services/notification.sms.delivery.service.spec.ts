import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationSmsDeliveryService } from '@modules/notification/services/notification.sms.delivery.service';

describe('NotificationSmsDeliveryService', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let service: NotificationSmsDeliveryService;

    const stampedAt = new Date('2026-03-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(stampedAt);
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsDeliveryService,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(NotificationSmsDeliveryService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('send', () => {
        it('logs the kind and the number masked to its last 3 digits, and neither the code nor the body', async () => {
            const log = vi.spyOn(Logger.prototype, 'log');

            await service.send(
                EnumNotificationKind.verificationMobileNumber,
                '+6281234567789',
                'Your code is 482913, reference VRF-abc'
            );

            expect(log).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledWith(
                {
                    kind: EnumNotificationKind.verificationMobileNumber,
                    to: '•••789',
                },
                expect.not.stringContaining('482913')
            );
        });
    });

    describe('stampProcessed', () => {
        it('stamps the sms delivery row processed now', async () => {
            await service.stampProcessed('notification-flint', 'user-flint');

            expect(
                notificationRepository.updateDeliveryProcessedAt
            ).toHaveBeenCalledWith(
                'notification-flint',
                EnumNotificationChannel.sms,
                stampedAt,
                'user-flint'
            );
        });
    });

    describe('stampSent', () => {
        it('stamps the sms delivery row sent now with no failure tokens', async () => {
            await service.stampSent('notification-flint', 'user-flint');

            expect(
                notificationRepository.updateDeliverySentAt
            ).toHaveBeenCalledWith(
                'notification-flint',
                EnumNotificationChannel.sms,
                stampedAt,
                [],
                'user-flint'
            );
        });
    });
});
