import { AnalyticStatusCountsCacheSchema } from '@modules/analytic/dtos/analytic.status-counts-cache.dto';

describe('AnalyticStatusCountsCacheSchema', () => {
    const payload = [{ status: 'status-1', count: 1, undeclared: 'extra' }];
    const expected = [{ status: 'status-1', count: 1 }];
    const invalid = [{ status: 123, count: 1 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticStatusCountsCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.status of the wrong type', () => {
        const result = AnalyticStatusCountsCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'status'],
                code: 'invalid_type',
            }),
        ]);
    });
});
