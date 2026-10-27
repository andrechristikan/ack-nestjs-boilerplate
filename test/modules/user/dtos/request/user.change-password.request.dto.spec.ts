import { UserChangePasswordRequestSchema } from '@modules/user/dtos/request/user.change-password.request.dto';
describe('UserChangePasswordRequestSchema', () => {
    const valid = { oldPassword: 'old', newPassword: 'Strong@@123' };
    it('accepts strong new credentials', () =>
        expect(UserChangePasswordRequestSchema.safeParse(valid).success).toBe(
            true
        ));
    it.each([
        { ...valid, oldPassword: '' },
        { ...valid, newPassword: 'weak' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(UserChangePasswordRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
    it('returns the password strength error for a weak new password', () => {
        expect(() =>
            UserChangePasswordRequestSchema.parse({
                ...valid,
                newPassword: 'password',
            })
        ).toThrow('request.error.isPassword.strong');
    });
});
