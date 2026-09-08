import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client';

/**
 * Base notification shape: one stored in-app notification of a user.
 */
export const NotificationResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    userId: z.string().meta({
        description: 'Identifier of the user the notification belongs to',
        example: faker.database.mongodbObjectId(),
    }),
    type: z.enum(EnumNotificationType).meta({
        description: 'Type of the notification',
        example: EnumNotificationType.securityAlert,
    }),
    priority: z.enum(EnumNotificationPriority).meta({
        description: 'Priority of the notification',
        example: EnumNotificationPriority.high,
    }),
    title: z.string().meta({
        description: 'Title shown to the user',
        example: 'Login',
    }),
    body: z.string().meta({
        description: 'Body text shown to the user',
        example: 'Login from web via credential',
    }),
    metadata: z.unknown().meta({
        description: 'Additional payload attached to the notification',
        example: { exampleKey: 'exampleValue' },
    }),
    isRead: z.boolean().meta({
        description: 'Whether the user has read the notification',
        example: false,
    }),
    readAt: z.date().nullable().meta({
        description: 'When the user read the notification',
        example: faker.date.recent(),
    }),
});

export type NotificationResponseDto = z.infer<
    typeof NotificationResponseSchema
>;
