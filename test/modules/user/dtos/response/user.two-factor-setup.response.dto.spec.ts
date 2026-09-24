import { UserTwoFactorSetupResponseSchema } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
describe('UserTwoFactorSetupResponseSchema', () => {
    it('selects setup material and strips unknown fields', () => {
        const result = UserTwoFactorSetupResponseSchema.parse({
            secret: 'secret',
            otpauthUrl: 'otpauth://value',
            unknown: true,
        });
        expect(result).toEqual({
            secret: 'secret',
            otpauthUrl: 'otpauth://value',
        });
    });
});
