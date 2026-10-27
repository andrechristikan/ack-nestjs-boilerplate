import { UserTwoFactorEnableResponseSchema } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
describe('UserTwoFactorEnableResponseSchema', () => {
    it('selects backup codes and strips secret material', () => {
        const result = UserTwoFactorEnableResponseSchema.parse({
            backupCodes: ['ABCD'],
            secret: 'secret',
        });
        expect(result).toEqual({ backupCodes: ['ABCD'] });
    });
});
