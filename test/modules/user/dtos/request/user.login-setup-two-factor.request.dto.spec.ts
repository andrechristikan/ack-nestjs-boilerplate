import { UserLoginSetupTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';

describe('UserLoginSetupTwoFactorRequestSchema', () => {
    const valid = { challengeToken: 'challenge', code: '123456' };

    it('accepts a numeric code and challenge token', () => {
        expect(UserLoginSetupTwoFactorRequestSchema.parse(valid)).toEqual(
            valid
        );
    });

    it.each([
        { ...valid, challengeToken: '' },
        { ...valid, code: 'ABCDEF' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input => {
        expect(
            UserLoginSetupTwoFactorRequestSchema.safeParse(input).success
        ).toBe(false);
    });
});
