import { UserTwoFactorSetupRequestSchema } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';

describe('UserTwoFactorSetupRequestSchema', () => {
    const payload = { backupCode: 'ABCD1234EF' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserTwoFactorSetupRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('defaults to an empty object when the body is missing', () => {
        const result = UserTwoFactorSetupRequestSchema.parse(undefined);

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({
                ...payload,
                code: '654321',
            })
        ).toThrow();
    });
});
