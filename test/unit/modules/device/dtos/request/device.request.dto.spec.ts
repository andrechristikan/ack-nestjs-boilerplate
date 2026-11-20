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
        const result = DeviceRequestSchema.safeParse({
            fingerprint: payload.fingerprint,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['platform'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a missing fingerprint', () => {
        const result = DeviceRequestSchema.safeParse({
            name: payload.name,
            platform: payload.platform,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['fingerprint'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a platform outside the enum', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            platform: 'windows',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['platform'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it.each(['', ' ', '   ', 'has space inside value', 'bad/char/fingerprint'])(
        'rejects the fingerprint %j',
        fingerprint => {
            const result = DeviceRequestSchema.safeParse({
                ...payload,
                fingerprint,
            });

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: ['fingerprint'],
                    code: 'too_small',
                }),
                expect.objectContaining({
                    path: ['fingerprint'],
                    code: 'invalid_format',
                }),
            ]);
        }
    );

    it('rejects the fingerprint short', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            fingerprint: 'short',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['fingerprint'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects a 31-character fingerprint at fingerprint', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            fingerprint: 'a'.repeat(31),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['fingerprint'],
                code: 'too_small',
            }),
        ]);
    });

    it('reports a length issue for a 31-character fingerprint', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            fingerprint: 'a'.repeat(31),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['fingerprint'],
                code: 'too_small',
            }),
        ]);
    });

    it('accepts a 32-character fingerprint', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            fingerprint: 'a'.repeat(32),
        });

        expect(result.success).toBe(true);
    });

    it('rejects a fingerprint above 128 characters', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            fingerprint: 'a'.repeat(129),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['fingerprint'], code: 'too_big' }),
        ]);
    });

    it('trims the fingerprint before matching', () => {
        const result = DeviceRequestSchema.parse({
            ...payload,
            fingerprint: `  ${payload.fingerprint}  `,
        });

        expect(result.fingerprint).toBe(payload.fingerprint);
    });

    it('rejects an empty or blank name', () => {
        const result = DeviceRequestSchema.safeParse({ ...payload, name: ' ' });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name above 100 characters', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            name: 'n'.repeat(101),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects an empty or blank notification token', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            notificationToken: ' ',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['notificationToken'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects a notification token above 512 characters', () => {
        const result = DeviceRequestSchema.safeParse({
            ...payload,
            notificationToken: 't'.repeat(513),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['notificationToken'],
                code: 'too_big',
            }),
        ]);
    });
});
