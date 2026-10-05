import { UserVerifyEmailRequestSchema } from '@modules/user/dtos/request/user.verify-email.request.dto';

describe('UserVerifyEmailRequestSchema', () => {
    const payload = { token: 'a1b2c3d4e5f6g7h8i9j0' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserVerifyEmailRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty token', () => {
        expect(() =>
            UserVerifyEmailRequestSchema.parse({ token: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserVerifyEmailRequestSchema.parse({
                ...payload,
                email: 'john.doe@example.com',
            })
        ).toThrow();
    });
});
