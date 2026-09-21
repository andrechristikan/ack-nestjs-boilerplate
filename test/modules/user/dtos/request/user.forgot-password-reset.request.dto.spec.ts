import { UserForgotPasswordResetRequestSchema } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
describe('UserForgotPasswordResetRequestSchema', () => {
    const valid = { token: 'token', newPassword: 'Strong@@123' };
    it('accepts a reset credential', () =>
        expect(
            UserForgotPasswordResetRequestSchema.safeParse(valid).success
        ).toBe(true));
    it.each([
        { ...valid, token: '' },
        { ...valid, newPassword: 'weak' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(
            UserForgotPasswordResetRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
