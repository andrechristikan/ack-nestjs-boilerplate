import { AnalyticLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.lockout.response.dto';

describe('AnalyticLockoutResponseSchema', () => {
    const row = { failed: 6, maxAttempt: 3 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticLockoutResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticLockoutResponseSchema.parse({
            ...row,
            emails: ['user@example.com'],
        });

        expect(result).toEqual(row);
    });
});
