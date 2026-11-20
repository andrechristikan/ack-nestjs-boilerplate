import { AnalyticFraudCredentialStuffingSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-credential-stuffing-summary.response.dto';

describe('AnalyticFraudCredentialStuffingSummaryResponseSchema', () => {
    const row = {
        count: 4,
        windowStart: new Date('2026-01-01T00:00:00.000Z'),
        windowEnd: new Date('2026-01-02T00:00:00.000Z'),
        computedAt: null,
        metadata: { minUniqueAccounts: 5 },
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

    it('rejects a row without metadata', () => {
        const result =
            AnalyticFraudCredentialStuffingSummaryResponseSchema.safeParse({
                count: row.count,
                windowStart: row.windowStart,
                windowEnd: row.windowEnd,
                computedAt: row.computedAt,
            });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['metadata'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a summary without the window and computedAt keys', () => {
        const result =
            AnalyticFraudCredentialStuffingSummaryResponseSchema.safeParse({
                count: row.count,
                metadata: row.metadata,
            });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['windowStart'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['windowEnd'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });
});
