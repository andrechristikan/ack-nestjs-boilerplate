import { AnalyticTwoFactorAttemptResponseSchema } from '@modules/analytic/dtos/response/analytic.two-factor-attempt.response.dto';

describe('AnalyticTwoFactorAttemptResponseSchema', () => {
    const row = { usersWithAttempts: 2, totalAttempts: 5 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticTwoFactorAttemptResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticTwoFactorAttemptResponseSchema.parse({
            ...row,
            backupCodes: ['code-1'],
        });

        expect(result).toEqual(row);
    });
});
