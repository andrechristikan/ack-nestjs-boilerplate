import { UserLoginSetupTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';

describe('UserLoginSetupTwoFactorRequestSchema', () => {
    const payload = {
        code: '654321',
        challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserLoginSetupTwoFactorRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a payload with no challengeToken', () => {
        expect(() =>
            UserLoginSetupTwoFactorRequestSchema.parse({ code: '654321' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserLoginSetupTwoFactorRequestSchema.parse({
                ...payload,
                backupCode: 'ABCD1234EF',
            })
        ).toThrow();
    });
});
