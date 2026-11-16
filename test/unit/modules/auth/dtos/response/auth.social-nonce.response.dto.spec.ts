import { AuthSocialNonceResponseSchema } from '@modules/auth/dtos/response/auth.social-nonce.response.dto';

describe('AuthSocialNonceResponseSchema', () => {
    const row = {
        nonce: 'plain-nonce',
        expiredAt: new Date('2026-01-01T00:05:00.000Z'),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AuthSocialNonceResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AuthSocialNonceResponseSchema.parse({
            ...row,
            nonceHash: 'hash-of-nonce',
        });

        expect(result).toEqual(row);
    });

    it('rejects a row missing the nonce', () => {
        const result = AuthSocialNonceResponseSchema.safeParse({
            expiredAt: row.expiredAt,
        });

        expect(result.success).toBe(false);
    });

    it('rejects a row missing the expiry', () => {
        const result = AuthSocialNonceResponseSchema.safeParse({
            nonce: row.nonce,
        });

        expect(result.success).toBe(false);
    });
});
