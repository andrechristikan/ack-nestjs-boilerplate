import { z } from 'zod';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';

/**
 * Validates the body for toggling one notification channel and type.
 * @public
 */
export const NotificationUserSettingRequestSchema = z.strictObject({
    channel: z
        .enum([
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
            EnumNotificationChannel.inApp,
        ])
        .meta({
            description: 'Notification channel to update',
            example: EnumNotificationChannel.email,
        }),
    type: z
        .enum([
            EnumNotificationType.userActivity,
            EnumNotificationType.marketing,
        ])
        .meta({
            description: 'Notification type to update',
            example: EnumNotificationType.userActivity,
        }),
    isActive: z.boolean().meta({
        description:
            'Whether notifications of this type and channel are active',
        example: true,
    }),
});

/**
 * Body for toggling one notification channel and type.
 * @public
 */
export type NotificationUserSettingRequestDto = z.infer<
    typeof NotificationUserSettingRequestSchema
>;
