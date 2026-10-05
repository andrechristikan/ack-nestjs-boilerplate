import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';

describe('AnalyticFraudSummaryResponseSchema', () => {
    const row = {
        count: 6,
        window: '86400000',
        meta: { minUniqueAccounts: 5 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a count-only row when optional fields are omitted', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse({ count: 0 });

        expect(result).toEqual({ count: 0 });
    });

    it('strips an undeclared key', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse({
            ...row,
            ipAddresses: ['10.0.0.1'],
        });

        expect(result).toEqual(row);
    });
});
