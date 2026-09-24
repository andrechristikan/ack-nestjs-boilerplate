import { UserForgotPasswordRequestSchema } from '@modules/user/dtos/request/user.forgot-password.request.dto';
describe('UserForgotPasswordRequestSchema', () => {
    it('normalizes a valid email', () =>
        expect(
            UserForgotPasswordRequestSchema.parse({
                email: ' USER@EXAMPLE.COM ',
            })
        ).toEqual({ email: 'user@example.com' }));
    it.each([{ email: 'bad' }, { email: 'user@example.com', unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(
                UserForgotPasswordRequestSchema.safeParse(input).success
            ).toBe(false)
    );
});
