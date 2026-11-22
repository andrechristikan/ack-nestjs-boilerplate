import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceResponseSchema } from '@modules/device/dtos/response/device.response.dto';

describe('DeviceResponseSchema', () => {
    const createdAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const row = {
        id: 'device-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt: createdAt,
        updatedBy: 'user-1',
        name: 'iPhone 12',
        platform: EnumDevicePlatform.ios,
        lastActiveAt: createdAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = DeviceResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips the fingerprint, notificationProvider, and an undeclared key', () => {
        const result = DeviceResponseSchema.parse({
            ...row,
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            notificationProvider: 'fcm',
        });

        expect(result).toEqual(row);
    });

    it('parses a null name', () => {
        const result = DeviceResponseSchema.parse({
            ...row,
            name: null,
        });

        expect(result).toEqual({
            ...row,
            name: null,
        });
    });
});
