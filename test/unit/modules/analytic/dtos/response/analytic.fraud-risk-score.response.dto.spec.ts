import { AnalyticFraudRiskScoreResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';

describe('AnalyticFraudRiskScoreResponseSchema', () => {
    const row = {
        userId: 'user-1',
        score: 42,
        band: 'medium',
        contributingSignalCodes: ['nearLockout'],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticFraudRiskScoreResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticFraudRiskScoreResponseSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
    });
});
