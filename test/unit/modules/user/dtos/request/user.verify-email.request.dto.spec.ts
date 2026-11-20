import { UserVerifyEmailRequestSchema } from '@modules/user/dtos/request/user.verify-email.request.dto';

describe('UserVerifyEmailRequestSchema', () => {
    const payload = { token: 'a1b2c3d4e5f6g7h8i9j0' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserVerifyEmailRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty token', () => {
        const result = UserVerifyEmailRequestSchema.safeParse({ token: '' });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['token'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserVerifyEmailRequestSchema.safeParse({
            ...payload,
            email: 'john.doe@example.com',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a token of 200 characters and rejects one of 201', () => {
        expect(() =>
            UserVerifyEmailRequestSchema.parse({
                ...payload,
                token: 'a'.repeat(200),
            })
        ).not.toThrow();
        const result = UserVerifyEmailRequestSchema.safeParse({
            ...payload,
            token: 'a'.repeat(201),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['token'], code: 'too_big' }),
        ]);
    });
});
