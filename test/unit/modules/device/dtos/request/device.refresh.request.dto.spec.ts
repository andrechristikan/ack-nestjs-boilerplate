import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceRefreshRequestSchema } from '@modules/device/dtos/request/device.refresh.request.dto';

describe('DeviceRefreshRequestSchema', () => {
    const payload = {
        name: "John's iPhone 12",
        platform: EnumDevicePlatform.android,
        notificationToken: 'fcm_token_1234567890abcdef',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = DeviceRefreshRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a null name and a null notification token', () => {
        const cleared = { ...payload, name: null, notificationToken: null };

        const result = DeviceRefreshRequestSchema.parse(cleared);

        expect(result).toEqual(cleared);
    });

    it.each(['name', 'platform', 'notificationToken'] as const)(
        'rejects a payload missing %s',
        field => {
            const { [field]: _omitted, ...rest } = payload;

            expect(() => DeviceRefreshRequestSchema.parse(rest)).toThrow();
        }
    );

    it('rejects a null platform', () => {
        expect(() =>
            DeviceRefreshRequestSchema.parse({ ...payload, platform: null })
        ).toThrow();
    });

    it('rejects a fingerprint since the field was omitted', () => {
        expect(() =>
            DeviceRefreshRequestSchema.parse({
                ...payload,
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            DeviceRefreshRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
