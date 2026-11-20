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

    it.each(['name', 'notificationToken'] as const)(
        'rejects a payload missing %s',
        field => {
            const { [field]: _omitted, ...rest } = payload;

            const result = DeviceRefreshRequestSchema.safeParse(rest);

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: [field],
                    code: 'invalid_type',
                }),
            ]);
        }
    );

    it('rejects a payload missing platform', () => {
        const { platform: _omitted, ...rest } = payload;

        const result = DeviceRefreshRequestSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['platform'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a null platform', () => {
        const result = DeviceRefreshRequestSchema.safeParse({
            ...payload,
            platform: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['platform'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a fingerprint since the field was omitted', () => {
        const result = DeviceRefreshRequestSchema.safeParse({
            ...payload,
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = DeviceRefreshRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
