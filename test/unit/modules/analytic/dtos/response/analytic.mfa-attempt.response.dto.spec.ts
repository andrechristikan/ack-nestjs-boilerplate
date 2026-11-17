import { AnalyticMfaAttemptResponseSchema } from '@modules/analytic/dtos/response/analytic.mfa-attempt.response.dto';

describe('AnalyticMfaAttemptResponseSchema', () => {
    const row = { usersWithAttempts: 2, totalAttempts: 5 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticMfaAttemptResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticMfaAttemptResponseSchema.parse({
            ...row,
            backupCodes: ['code-1'],
        });

        expect(result).toEqual(row);
    });
});
