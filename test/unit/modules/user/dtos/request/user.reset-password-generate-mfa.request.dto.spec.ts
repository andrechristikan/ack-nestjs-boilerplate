import { UserResetPasswordGenerateMfaRequestSchema } from '@modules/user/dtos/request/user.reset-password-generate-mfa.request.dto';

describe('UserResetPasswordGenerateMfaRequestSchema', () => {
    const payload = { token: 'a1b2c3d4e5f6g7h8i9j0' };

    it('parses a payload into exactly the declared fields', () => {
        expect(
            UserResetPasswordGenerateMfaRequestSchema.parse(payload)
        ).toEqual(payload);
    });

    it('rejects a payload with no token', () => {
        const result = UserResetPasswordGenerateMfaRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['token'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserResetPasswordGenerateMfaRequestSchema.safeParse({
            ...payload,
            newPassword: 'abcDE12345@@!',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a token of 200 characters and rejects one of 201', () => {
        expect(() =>
            UserResetPasswordGenerateMfaRequestSchema.parse({
                token: 'a'.repeat(200),
            })
        ).not.toThrow();
        const result = UserResetPasswordGenerateMfaRequestSchema.safeParse({
            token: 'a'.repeat(201),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['token'], code: 'too_big' }),
        ]);
    });
});
