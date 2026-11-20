import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';

describe('AnalyticFraudSummaryResponseSchema', () => {
    const windowStart = new Date('2026-01-01T00:00:00.000Z');
    const windowEnd = new Date('2026-01-02T00:00:00.000Z');
    const computedAt = new Date('2026-01-02T00:00:05.000Z');
    const summary = { count: 1, windowStart, windowEnd, computedAt };

    it('parses a summary into exactly the declared fields', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse(summary);

        expect(result).toEqual(summary);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse({
            ...summary,
            metadata: { minUniqueAccounts: 5 },
            ipAddresses: ['10.0.0.1'],
        });

        expect(result).toEqual(summary);
    });

    it.each(['windowStart', 'windowEnd', 'computedAt'])(
        'rejects a summary without the %s key',
        key => {
            const { [key]: _omitted, ...rest } = summary as Record<
                string,
                unknown
            >;

            const result = AnalyticFraudSummaryResponseSchema.safeParse(rest);

            expect(result.error?.issues).toEqual([
                expect.objectContaining({ path: [key], code: 'invalid_type' }),
            ]);
        }
    );

    it('parses windowStart, windowEnd, and computedAt as null', () => {
        const result = AnalyticFraudSummaryResponseSchema.parse({
            count: 0,
            windowStart: null,
            windowEnd: null,
            computedAt: null,
        });

        expect(result).toEqual({
            count: 0,
            windowStart: null,
            windowEnd: null,
            computedAt: null,
        });
    });

    it('rejects the former window string', () => {
        const result = AnalyticFraudSummaryResponseSchema.safeParse({
            ...summary,
            windowStart: '3600000',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['windowStart'],
                code: 'invalid_type',
            }),
        ]);
    });
});
