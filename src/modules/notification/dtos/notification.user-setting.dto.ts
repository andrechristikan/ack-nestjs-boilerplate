import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';

/**
 * Base notification-user-setting shape: one stored channel/type toggle of a user.
 */
export const NotificationUserSettingSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    userId: z.string().meta({
        description: 'User ID',
        example: faker.database.mongodbObjectId(),
    }),
    type: z.enum(EnumNotificationType).meta({
        description: 'Notification type',
        example: EnumNotificationType.securityAlert,
    }),
    channel: z.enum(EnumNotificationChannel).meta({
        description: 'Notification channel',
        example: EnumNotificationChannel.email,
    }),
    isActive: z.boolean().meta({
        description: 'Whether the notification is active',
        example: true,
        default: true,
    }),
});

export type NotificationUserSettingDto = z.infer<
    typeof NotificationUserSettingSchema
>;
