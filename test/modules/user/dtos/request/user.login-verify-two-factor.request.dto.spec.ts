import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
describe('UserLoginVerifyTwoFactorRequestSchema', () => {
    const valid = {
        challengeToken: 'token',
        method: EnumAuthTwoFactorMethod.code,
        code: '123456',
    };
    it('accepts numeric codes and uppercase backup codes', () => {
        expect(
            UserLoginVerifyTwoFactorRequestSchema.safeParse(valid).success
        ).toBe(true);
        expect(
            UserLoginVerifyTwoFactorRequestSchema.safeParse({
                ...valid,
                method: EnumAuthTwoFactorMethod.backupCodes,
                code: undefined,
                backupCode: 'ABCD1234',
            }).success
        ).toBe(true);
    });
    it.each([
        { ...valid, challengeToken: '' },
        { ...valid, code: 'abc' },
        { ...valid, backupCode: 'lower' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(
            UserLoginVerifyTwoFactorRequestSchema.safeParse(input).success
        ).toBe(false)
    );
    it.each([
        { ...valid, code: 'invalid' },
        {
            ...valid,
            method: EnumAuthTwoFactorMethod.backupCodes,
            code: undefined,
            backupCode: 'invalid-code',
        },
    ])('returns the two-factor error for malformed codes', input => {
        expect(() =>
            UserLoginVerifyTwoFactorRequestSchema.parse(input)
        ).toThrow('auth.error.twoFactorCodeRequired');
    });
});
