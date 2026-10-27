import { UserTwoFactorSetupRequestSchema } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
describe('UserTwoFactorSetupRequestSchema', () => {
    it('defaults a missing body and accepts an uppercase backup code', () => {
        expect(UserTwoFactorSetupRequestSchema.parse(undefined)).toEqual({});
        expect(
            UserTwoFactorSetupRequestSchema.safeParse({
                backupCode: 'ABCD1234',
            }).success
        ).toBe(true);
    });
    it.each([{ backupCode: 'lower' }, { unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(
                UserTwoFactorSetupRequestSchema.safeParse(input).success
            ).toBe(false)
    );
});
