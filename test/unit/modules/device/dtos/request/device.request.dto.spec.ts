import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

describe('DeviceRequestSchema', () => {
    const payload = {
        fingerprint: 'abc123def456ghi789jkl012mno345pq',
        name: "John's iPhone 12",
        platform: EnumDevicePlatform.ios,
        notificationToken: 'fcm_token_1234567890abcdef',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = DeviceRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with only the required fingerprint', () => {
        const result = DeviceRequestSchema.parse({
            fingerprint: payload.fingerprint,
        });

        expect(result).toEqual({ fingerprint: payload.fingerprint });
    });

    it('rejects a missing fingerprint', () => {
        expect(() =>
            DeviceRequestSchema.parse({ name: payload.name })
        ).toThrow();
    });

    it('rejects a platform outside the enum', () => {
        expect(() =>
            DeviceRequestSchema.parse({
                ...payload,
                platform: 'windows',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            DeviceRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
