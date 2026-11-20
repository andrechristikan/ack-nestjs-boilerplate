import { AnalyticNearLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';

describe('AnalyticNearLockoutResponseSchema', () => {
    const lastLoginAt = new Date('2026-01-02T03:04:05.000Z');
    const createdAt = new Date('2025-11-30T21:22:23.000Z');

    const row = {
        id: 'user-1',
        email: 'user@example.com',
        passwordAttempt: 4,
        lastLoginAt,
        createdAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticNearLockoutResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('keeps a null lastLoginAt', () => {
        const result = AnalyticNearLockoutResponseSchema.parse({
            ...row,
            lastLoginAt: null,
        });

        expect(result).toEqual({ ...row, lastLoginAt: null });
    });

    it('rejects a null passwordAttempt', () => {
        const result = AnalyticNearLockoutResponseSchema.safeParse({
            ...row,
            passwordAttempt: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passwordAttempt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a createdAt that arrives as an ISO string', () => {
        const result = AnalyticNearLockoutResponseSchema.safeParse({
            ...row,
            createdAt: createdAt.toISOString(),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['createdAt'],
                code: 'invalid_type',
            }),
        ]);
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
