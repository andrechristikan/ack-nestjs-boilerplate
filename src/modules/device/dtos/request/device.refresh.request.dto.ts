import { z } from 'zod';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

/** @public */
export const DeviceRefreshRequestSchema = DeviceRequestSchema.omit({
    fingerprint: true,
}).extend({
    name: z.string().trim().min(1).max(100).nullable().meta({
        description: 'Device name, null clears it',
        example: "John's iPhone 12",
    }),
    platform: z.enum(EnumDevicePlatform).meta({
        description: 'Device platform',
        example: EnumDevicePlatform.ios,
    }),
    notificationToken: z.string().trim().min(1).max(512).nullable().meta({
        description:
            'Notification token for push notifications, null clears it',
        example: 'fcm_token_1234567890abcdef',
    }),
});

/** @public */
export type DeviceRefreshRequestDto = z.infer<
    typeof DeviceRefreshRequestSchema
>;
