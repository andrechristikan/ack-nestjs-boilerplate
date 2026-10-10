import type { INestApplication } from '@nestjs/common';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client';
import type { Notification } from '@generated/prisma-client';
import { getPrismaClient } from '@test/e2e/support/prisma';

/**
 * Persists a real, unread `Notification` row directly through the app's Prisma client. Every
 * notification the app itself creates goes out through `NotificationQueue` (SES/push/in-app
 * delivery, disabled in this profile) — this fixture builds the row a
 * `notification.shared.controller` read/mutate route needs without going through that queue.
 */
export async function createNotificationFixture(
    app: INestApplication,
    userId: string,
    overrides?: Partial<{
        type: EnumNotificationType;
        priority: EnumNotificationPriority;
        title: string;
        body: string;
        isRead: boolean;
    }>
): Promise<Notification> {
    const prisma = getPrismaClient(app);

    return prisma.notification.create({
        data: {
            userId,
            type: overrides?.type ?? EnumNotificationType.userActivity,
            priority: overrides?.priority ?? EnumNotificationPriority.normal,
            title: overrides?.title ?? 'E2E fixture notification',
            body: overrides?.body ?? 'E2E fixture notification body',
            isRead: overrides?.isRead ?? false,
            createdBy: userId,
        },
    });
}
