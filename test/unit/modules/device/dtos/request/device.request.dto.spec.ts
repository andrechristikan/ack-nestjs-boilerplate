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

    it('parses with only the required fingerprint and platform', () => {
        const result = DeviceRequestSchema.parse({
            fingerprint: payload.fingerprint,
            platform: payload.platform,
        });

        expect(result).toEqual({
            fingerprint: payload.fingerprint,
            platform: payload.platform,
        });
    });

    it('rejects a missing platform', () => {
        expect(() =>
            DeviceRequestSchema.parse({ fingerprint: payload.fingerprint })
        ).toThrow();
    });

    it('rejects a missing fingerprint', () => {
        expect(() =>
            DeviceRequestSchema.parse({
                name: payload.name,
                platform: payload.platform,
            })
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

    it.each([
        '',
        ' ',
        '   ',
        'short',
        'has space inside value',
        'bad/char/fingerprint',
    ])('rejects the fingerprint %j', fingerprint => {
        expect(() =>
            DeviceRequestSchema.parse({ ...payload, fingerprint })
        ).toThrow();
    });

    it('rejects a fingerprint above 128 characters', () => {
        expect(() =>
            DeviceRequestSchema.parse({
                ...payload,
                fingerprint: 'a'.repeat(129),
            })
        ).toThrow();
    });

    it('trims the fingerprint before matching', () => {
        const result = DeviceRequestSchema.parse({
            ...payload,
            fingerprint: `  ${payload.fingerprint}  `,
        });

        expect(result.fingerprint).toBe(payload.fingerprint);
    });

    it('rejects an empty or blank name', () => {
        expect(() =>
            DeviceRequestSchema.parse({ ...payload, name: ' ' })
        ).toThrow();
    });

    it('rejects a name above 100 characters', () => {
        expect(() =>
            DeviceRequestSchema.parse({ ...payload, name: 'n'.repeat(101) })
        ).toThrow();
    });

    it('rejects an empty or blank notification token', () => {
        expect(() =>
            DeviceRequestSchema.parse({ ...payload, notificationToken: ' ' })
        ).toThrow();
    });

    it('rejects a notification token above 512 characters', () => {
        expect(() =>
            DeviceRequestSchema.parse({
                ...payload,
                notificationToken: 't'.repeat(513),
            })
        ).toThrow();
    });
});
