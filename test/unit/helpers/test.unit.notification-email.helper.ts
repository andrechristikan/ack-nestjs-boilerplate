import type { MockProxy } from 'vitest-mock-extended';
import type { AwsSESService } from '@common/aws/services/aws.ses.service';
import type { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { NotificationRepository } from '@modules/notification/repositories/notification.repository';

export const TestEmailProcessedAt = new Date('2024-03-01T00:00:00.000Z');

export const TestEmailSentAt = new Date('2024-03-01T00:00:05.000Z');

export function stubEmailStampOrder(
    notificationRepository: MockProxy<NotificationRepository>,
    awsSESService: MockProxy<AwsSESService>,
    helperDateService: MockProxy<HelperDateService>
): string[] {
    const callOrder: string[] = [];
    helperDateService.create
        .mockReturnValueOnce(TestEmailProcessedAt)
        .mockReturnValueOnce(TestEmailSentAt);
    notificationRepository.updateDeliveryProcessedAt.mockImplementation(
        async () => {
            callOrder.push('processed');

            return true;
        }
    );
    awsSESService.send.mockImplementation(async () => {
        callOrder.push('send');

        return { $metadata: {}, MessageId: 'message-1' };
    });
    notificationRepository.updateDeliverySentAt.mockImplementation(async () => {
        callOrder.push('sent');

        return true;
    });

    return callOrder;
}

export function expectEmailStampOrder(
    notificationRepository: MockProxy<NotificationRepository>,
    callOrder: string[],
    notificationId: string
): void {
    expect(callOrder).toEqual(['processed', 'send', 'sent']);
    expect(
        notificationRepository.updateDeliveryProcessedAt
    ).toHaveBeenCalledWith(
        notificationId,
        EnumNotificationChannel.email,
        TestEmailProcessedAt
    );
    expect(notificationRepository.updateDeliverySentAt).toHaveBeenCalledWith(
        notificationId,
        EnumNotificationChannel.email,
        TestEmailSentAt,
        []
    );
}

export function expectEmailSentNotStamped(
    notificationRepository: MockProxy<NotificationRepository>
): void {
    expect(
        notificationRepository.updateDeliveryProcessedAt
    ).toHaveBeenCalledTimes(1);
    expect(notificationRepository.updateDeliverySentAt).not.toHaveBeenCalled();
}
