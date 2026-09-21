import { EnumUserSignUpFrom } from '@generated/prisma-client/client';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';

describe('UserSignUpRequestSchema', () => {
    const valid = {
        username: 'newcomer',
        email: 'USER@example.com',
        countryId: '507f1f77bcf86cd799439011',
        password: 'Strong1!',
        marketing: true,
        cookies: false,
        from: EnumUserSignUpFrom.website,
    };

    it('normalizes credentials and accepts an invitation', () => {
        expect(
            UserSignUpRequestSchema.parse({
                ...valid,
                inviteToken: 'invite-token',
            })
        ).toMatchObject({
            email: 'user@example.com',
            inviteToken: 'invite-token',
        });
    });

    it.each([
        { ...valid, password: 'weak' },
        { ...valid, inviteToken: '' },
        { ...valid, from: 'admin' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input => {
        expect(UserSignUpRequestSchema.safeParse(input).success).toBe(false);
    });

    it('returns the password strength error for a weak password', () => {
        expect(() =>
            UserSignUpRequestSchema.parse({
                ...valid,
                password: 'password',
            })
        ).toThrow('request.error.isPassword.strong');
    });
});
