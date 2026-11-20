import { EnumAnalyticFraudBand } from '@modules/analytic/enums/analytic.enum';
import { AnalyticFraudRiskScoreUserResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score-user.response.dto';

describe('AnalyticFraudRiskScoreUserResponseSchema', () => {
    const row = {
        userId: 'user-1',
        score: 0,
        band: EnumAnalyticFraudBand.monitor,
        contributingSignalCodes: [],
    };

    it('parses a row with its computedAt', () => {
        const computedAt = new Date('2026-03-01T00:15:00.000Z');

        const result = AnalyticFraudRiskScoreUserResponseSchema.parse({
            ...row,
            computedAt,
        });

        expect(result).toEqual({ ...row, computedAt });
    });

    it('parses a null computedAt before the first run', () => {
        const result = AnalyticFraudRiskScoreUserResponseSchema.parse({
            ...row,
            computedAt: null,
        });

        expect(result).toEqual({ ...row, computedAt: null });
    });

    it('rejects a row with no computedAt', () => {
        const result = AnalyticFraudRiskScoreUserResponseSchema.safeParse(row);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });
});
