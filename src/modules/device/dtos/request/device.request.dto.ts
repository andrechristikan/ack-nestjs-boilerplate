import { z } from 'zod';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceFingerprintRegex } from '@modules/device/constants/device.constant';

/** @public */
export const DeviceRequestSchema = z.strictObject({
    fingerprint: z.string().trim().regex(DeviceFingerprintRegex).meta({
        description: 'Device fingerprint to uniquely identify the device',
        example: 'abc123def456ghi789jkl012mno345pq',
    }),
    name: z.string().trim().min(1).max(100).optional().meta({
        description: 'Device name',
        example: "John's iPhone 12",
    }),
    platform: z.enum(EnumDevicePlatform).optional().meta({
        description: 'Device platform',
        example: EnumDevicePlatform.ios,
    }),
    notificationToken: z.string().trim().min(1).max(512).optional().meta({
        description: 'Notification token for push notifications',
        example: 'fcm_token_1234567890abcdef',
    }),
});

/** @public */
export type DeviceRequestDto = z.infer<typeof DeviceRequestSchema>;
