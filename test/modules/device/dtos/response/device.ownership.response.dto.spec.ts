import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import { DeviceOwnershipResponseSchema } from '@modules/device/dtos/response/device.ownership.response.dto';

describe('DeviceOwnershipResponseSchema', () => {
    const createdAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const device = {
        id: 'device-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt: createdAt,
        updatedBy: 'user-1',
        name: 'iPhone 12',
        platform: EnumDevicePlatform.ios,
        lastActiveAt: createdAt,
        notificationProvider: EnumDeviceNotificationProvider.apns,
    };
    const row = {
        id: 'device-ownership-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt: createdAt,
        updatedBy: 'user-1',
        deviceId: 'device-1',
        device,
        userId: 'user-1',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        revokedBy: null,
        activeSessionCount: 2,
        isCurrentDevice: true,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = DeviceOwnershipResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips deletedAt, deletedBy, and an undeclared key', () => {
        const result = DeviceOwnershipResponseSchema.parse({
            ...row,
            deletedAt: createdAt,
            deletedBy: 'user-1',
            secret: 'top-secret',
        });

        expect(result).toEqual(row);
    });

    it('parses a revoked ownership with the revoking user embedded', () => {
        const revokedBy = {
            id: 'user-2',
            createdAt,
            createdBy: 'user-2',
            updatedAt: createdAt,
            updatedBy: 'user-2',
            deletedAt: null,
            deletedBy: null,
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
        };

        const result = DeviceOwnershipResponseSchema.parse({
            ...row,
            revokedAt: createdAt,
            isRevoked: true,
            revokedById: 'user-2',
            revokedBy,
        });

        expect(result).toEqual({
            ...row,
            revokedAt: createdAt,
            isRevoked: true,
            revokedById: 'user-2',
            revokedBy,
        });
    });

    it('strips the stored biometric token even when present on the input', () => {
        const result = DeviceOwnershipResponseSchema.parse({
            ...row,
            biometricEnabled: true,
            biometricToken: 'top-secret-biometric-token',
            biometricType: 'faceId',
            biometricEnabledAt: createdAt,
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('biometricToken');
    });
});
