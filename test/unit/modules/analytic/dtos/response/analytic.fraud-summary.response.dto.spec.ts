import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';

describe('AnalyticFraudSummaryResponseSchema', () => {
    const summary = { count: 1, window: 'window-token' };

    it('parses a summary into exactly the declared fields', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse(summary);

        expect(result).toEqual(summary);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse({
            ...summary,
            meta: { minUniqueAccounts: 5 },
            ipAddresses: ['10.0.0.1'],
        });

        expect(result).toEqual(summary);
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticFraudSummaryResponseSchema.parse({ count: 1 })
        ).toThrow();
    });

    it('accepts a null window', () => {
        expect(
            AnalyticFraudSummaryResponseSchema.parse({
                ...summary,
                window: null,
            })
        ).toEqual({ ...summary, window: null });
    });
});
