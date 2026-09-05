import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';

/**
 * Base device shape: the stored device row without the fingerprint and the notification token.
 */
export const DeviceResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    name: z.string().nullable().meta({
        description: 'Device name',
        example: faker.commerce.productName(),
    }),
    platform: z.enum(EnumDevicePlatform).meta({
        description: 'Device platform',
        example: EnumDevicePlatform.android,
    }),
    lastActiveAt: z.date().meta({
        description: 'Last active date',
        example: faker.date.recent(),
    }),
    notificationProvider: z
        .enum(EnumDeviceNotificationProvider)
        .nullable()
        .meta({
            description: 'Device notification provider',
            example: EnumDeviceNotificationProvider.fcm,
        }),
});

export type DeviceResponseDto = z.infer<typeof DeviceResponseSchema>;
