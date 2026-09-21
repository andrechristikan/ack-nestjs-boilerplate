import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserTwoFactorDisableRequestSchema } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';

describe('UserTwoFactorDisableRequestSchema', () => {
    it.each([
        { method: EnumAuthTwoFactorMethod.code, code: '123456' },
        {
            method: EnumAuthTwoFactorMethod.backupCodes,
            backupCode: 'ABCD1234',
        },
    ])('accepts supported verification input', input => {
        expect(UserTwoFactorDisableRequestSchema.parse(input)).toEqual(input);
    });

    it.each([
        { method: EnumAuthTwoFactorMethod.code, code: 'invalid' },
        { method: EnumAuthTwoFactorMethod.backupCodes, backupCode: 'lower' },
        { method: EnumAuthTwoFactorMethod.code, code: '123456', unknown: true },
    ])('rejects malformed or unknown input', input => {
        expect(UserTwoFactorDisableRequestSchema.safeParse(input).success).toBe(
            false
        );
    });
});
