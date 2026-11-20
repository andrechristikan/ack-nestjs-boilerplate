import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import {
    AnalyticFraudRiskScoreResponseSchema,
    AnalyticFraudRiskScoreUserResponseSchema,
} from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';

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

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['band'], code: 'invalid_value' }),
        ]);
    });

    it('rejects a contributing signal code outside the known signals', () => {
        const result = AnalyticFraudRiskScoreResponseSchema.safeParse({
            ...row,
            contributingSignalCodes: ['credentialStuffing'],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['contributingSignalCodes', 0],
                code: 'invalid_value',
            }),
        ]);
    });
});

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
