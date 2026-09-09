import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { DeviceResponseSchema } from '@modules/device/dtos/response/device.response.dto';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base device-ownership shape: the row binding a device to the user who owns it.
 */
export const DeviceOwnershipResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    deviceId: z.string().meta({
        description: 'Device ownership ID',
        example: faker.string.uuid(),
    }),
    device: DeviceResponseSchema.meta({
        description: 'Device information',
        example: {
            id: faker.string.uuid(),
            createdAt: faker.date.recent(),
            createdBy: faker.string.uuid(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.string.uuid(),
            name: faker.commerce.productName(),
            platform: EnumDevicePlatform.android,
            lastActiveAt: faker.date.recent(),
            notificationProvider: EnumDeviceNotificationProvider.fcm,
        },
    }),
    userId: z.string().meta({
        description: 'User ID who owns the device',
        example: faker.string.uuid(),
    }),
    revokedAt: z.date().nullable().meta({
        description: 'Date the device ownership was revoked',
        example: faker.date.recent(),
    }),
    isRevoked: z.boolean().meta({
        description: 'Indicates if the device ownership is revoked',
        example: true,
    }),
    revokedById: z.string().nullable().meta({
        description: 'User ID who revoked the device ownership',
        example: faker.string.uuid(),
    }),
    revokedBy: UserRefResponseSchema.nullable().meta({
        description: 'User who revoked the device ownership',
        example: {
            id: faker.string.uuid(),
            createdAt: faker.date.recent(),
            createdBy: faker.string.uuid(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.string.uuid(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.string.uuid(),
            name: faker.person.fullName(),
            username: faker.internet.username().toLowerCase(),
            photo: {
                bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
                key: faker.system.filePath(),
                cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                mime: 'image/jpeg',
                extension: 'jpg',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
            },
        },
    }),
    activeSessionCount: z.number().meta({
        description: 'Session count for the device',
        example: 5,
    }),
    isCurrentDevice: z.boolean().meta({
        description: 'Indicates if this is the current active device',
        example: true,
    }),
});

export type DeviceOwnershipResponseDto = z.infer<
    typeof DeviceOwnershipResponseSchema
>;
