import { UserForgotPasswordRequestSchema } from '@modules/user/dtos/request/user.forgot-password.request.dto';

describe('UserForgotPasswordRequestSchema', () => {
    const payload = { email: 'john.doe@example.com' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserForgotPasswordRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = UserForgotPasswordRequestSchema.safeParse({
            ...payload,
            password: 'secret',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
