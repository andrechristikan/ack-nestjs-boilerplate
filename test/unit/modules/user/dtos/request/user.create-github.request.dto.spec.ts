import {
    EnumDevicePlatform,
    EnumUserLoginFrom,
} from '@generated/prisma-client/client';
import { UserCreateGithubRequestSchema } from '@modules/user/dtos/request/user.create-github.request.dto';

describe('UserCreateGithubRequestSchema', () => {
    const payload = {
        username: 'developer123',
        name: 'John Doe',
        countryId: '507f1f77bcf86cd799439012',
        marketing: true,
        cookies: true,
        inviteToken: 'a1b2c3d4e5',
        from: EnumUserLoginFrom.website,
        device: {
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: "John's iPhone",
            platform: EnumDevicePlatform.ios,
            notificationToken: 'fcm-token-1',
        },
        code: 'a1b2c3d4e5f6a7b8c9d0',
        redirectUri: 'https://app.example.com/auth/github/callback',
        codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    };

    it('parses the social fields and the three GitHub fields into exactly the declared fields', () => {
        const result = UserCreateGithubRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it.each(['code', 'redirectUri', 'codeVerifier'] as const)(
        'rejects a payload missing %s',
        field => {
            const { [field]: _omitted, ...rest } = payload;

            expect(() => UserCreateGithubRequestSchema.parse(rest)).toThrow();
        }
    );

    it('rejects an undeclared key', () => {
        expect(() =>
            UserCreateGithubRequestSchema.parse({
                ...payload,
                email: 'john.doe@example.com',
            })
        ).toThrow();
    });
});
