import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorDisableRequestSchema } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';

describe('UserTwoFactorDisableRequestSchema', () => {
    const payload = {
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserTwoFactorDisableRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a challengeToken as an undeclared key', () => {
        expect(() =>
            UserTwoFactorDisableRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});
