import { UserTwoFactorResponseSchema } from '@modules/user/dtos/response/user.two-factor.response.dto';

describe('UserTwoFactorResponseSchema', () => {
    const valid = {
        isRequiredSetup: false,
        challengeToken: 'challenge-token',
        challengeExpiresInMs: 300_000,
        backupCodesRemaining: 8,
    };

    it('accepts a challenge without optional setup material', () => {
        expect(UserTwoFactorResponseSchema.parse(valid)).toEqual(valid);
    });

    it('selects optional setup material and strips unknown fields', () => {
        const result = UserTwoFactorResponseSchema.parse({
            ...valid,
            secret: 'BASE32SECRET',
            otpauthUrl: 'otpauth://totp/example',
            unknown: true,
        });

        expect(result).toMatchObject({
            secret: 'BASE32SECRET',
            otpauthUrl: 'otpauth://totp/example',
        });
        expect(result).not.toHaveProperty('unknown');
    });
});
