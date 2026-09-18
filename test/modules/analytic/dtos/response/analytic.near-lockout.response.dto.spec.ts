import { AnalyticNearLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';

describe('AnalyticNearLockoutResponseSchema', () => {
    const lastLoginAt = new Date('2026-01-02T03:04:05.000Z');

    const row = {
        id: 'user-1',
        email: 'user@example.com',
        passwordAttempt: 4,
        lastLoginAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticNearLockoutResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('keeps a null passwordAttempt and a null lastLoginAt', () => {
        const result = AnalyticNearLockoutResponseSchema.parse({
            ...row,
            passwordAttempt: null,
            lastLoginAt: null,
        });

        expect(result).toEqual({
            id: 'user-1',
            email: 'user@example.com',
            passwordAttempt: null,
            lastLoginAt: null,
        });
    });

    it('strips the credential fields a full user row carries', () => {
        const result = AnalyticNearLockoutResponseSchema.parse({
            ...row,
            password: 'hashed-password',
            passwordCreated: lastLoginAt,
            passwordExpired: lastLoginAt,
            salt: 'salt',
        });

        expect(result).toEqual(row);
    });
});
