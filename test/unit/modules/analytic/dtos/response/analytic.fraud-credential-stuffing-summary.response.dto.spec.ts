import { AnalyticFraudCredentialStuffingSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-credential-stuffing-summary.response.dto';

describe('AnalyticFraudCredentialStuffingSummaryResponseSchema', () => {
    const row = {
        count: 4,
        window: '86400000',
        meta: { minUniqueAccounts: 5 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticFraudCredentialStuffingSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result =
            AnalyticFraudCredentialStuffingSummaryResponseSchema.parse({
                ...row,
                sessions: [{ id: 'session-1' }],
            });

        expect(result).toEqual(row);
    });

    it('rejects a row without meta', () => {
        expect(() =>
            AnalyticFraudCredentialStuffingSummaryResponseSchema.parse({
                count: row.count,
                window: row.window,
            })
        ).toThrow();
    });

    it('rejects a cached summary without the window key', () => {
        expect(() =>
            AnalyticFraudCredentialStuffingSummaryResponseSchema.parse({
                count: row.count,
                meta: row.meta,
            })
        ).toThrow();
    });
});
