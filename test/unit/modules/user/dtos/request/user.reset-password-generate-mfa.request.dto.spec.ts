import { UserResetPasswordGenerateMfaRequestSchema } from '@modules/user/dtos/request/user.reset-password-generate-mfa.request.dto';

describe('UserResetPasswordGenerateMfaRequestSchema', () => {
    const payload = { token: 'a1b2c3d4e5f6g7h8i9j0' };

    it('parses a payload into exactly the declared fields', () => {
        expect(
            UserResetPasswordGenerateMfaRequestSchema.parse(payload)
        ).toEqual(payload);
    });

    it('rejects a payload with no token', () => {
        expect(() =>
            UserResetPasswordGenerateMfaRequestSchema.parse({})
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserResetPasswordGenerateMfaRequestSchema.parse({
                ...payload,
                newPassword: 'abcDE12345@@!',
            })
        ).toThrow();
    });

    it('accepts a token of 200 characters and rejects one of 201', () => {
        expect(() =>
            UserResetPasswordGenerateMfaRequestSchema.parse({
                token: 'a'.repeat(200),
            })
        ).not.toThrow();
        expect(() =>
            UserResetPasswordGenerateMfaRequestSchema.parse({
                token: 'a'.repeat(201),
            })
        ).toThrow();
    });
});
