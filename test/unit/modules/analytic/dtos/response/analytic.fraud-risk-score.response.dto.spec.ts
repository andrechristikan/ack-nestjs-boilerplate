import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticFraudRiskScoreResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';

describe('AnalyticFraudRiskScoreResponseSchema', () => {
    const row = {
        userId: 'user-1',
        score: 42,
        band: EnumAnalyticFraudBand.review,
        contributingSignalCodes: [
            EnumAnalyticFraudContributingSignal.nearLockout,
        ],
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

    it('rejects a band outside the fraud bands', () => {
        const result = AnalyticFraudRiskScoreResponseSchema.safeParse({
            ...row,
            band: 'medium',
        });

        expect(result.success).toBe(false);
    });

    it('rejects a contributing signal code outside the known signals', () => {
        const result = AnalyticFraudRiskScoreResponseSchema.safeParse({
            ...row,
            contributingSignalCodes: ['credentialStuffing'],
        });

        expect(result.success).toBe(false);
    });
});
