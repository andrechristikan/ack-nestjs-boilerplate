import {
    EnumDevicePlatform,
    EnumUserLoginFrom,
} from '@generated/prisma-client/client';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

describe('UserLoginRequestSchema', () => {
    const payload = {
        email: 'john.doe@example.com',
        password: 'password123',
        from: EnumUserLoginFrom.website,
        device: {
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: "John's iPhone",
            platform: EnumDevicePlatform.ios,
            notificationToken: 'fcm-token-1',
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserLoginRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims and lower-cases the email', () => {
        const result = UserLoginRequestSchema.parse({
            ...payload,
            email: '  John.Doe@Example.com  ',
        });

        expect(result).toEqual(payload);
    });

    it('rejects an email failing the custom email validation', () => {
        expect(() =>
            UserLoginRequestSchema.parse({ ...payload, email: 'not-an-email' })
        ).toThrow();
    });

    it('rejects a device missing the fingerprint', () => {
        const { fingerprint: _fingerprint, ...deviceWithoutFingerprint } =
            payload.device;

        expect(() =>
            UserLoginRequestSchema.parse({
                ...payload,
                device: deviceWithoutFingerprint,
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserLoginRequestSchema.parse({ ...payload, rememberMe: true })
        ).toThrow();
    });
});
