import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorSetupRequestSchema } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';

describe('UserTwoFactorSetupRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the password, backup code, and email code into exactly the declared fields', () => {
        const result = UserTwoFactorSetupRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = UserTwoFactorSetupRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it.each([
        ['method', EnumAuthTwoFactorMethod.code],
        ['code', '654321'],
    ])('rejects the discarded %s field', (key, value) => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({ ...payload, [key]: value })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});
