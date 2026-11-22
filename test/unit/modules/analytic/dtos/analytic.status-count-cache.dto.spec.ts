import { AnalyticStatusCountCacheSchema } from '@modules/analytic/dtos/analytic.status-count-cache.dto';

describe('AnalyticStatusCountCacheSchema', () => {
    const payload = { status: 'status-1', count: 1, undeclared: 'extra' };
    const expected = { status: 'status-1', count: 1 };
    const invalid = { status: 123, count: 1 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticStatusCountCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with status of the wrong type', () => {
        const result = AnalyticStatusCountCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['status'],
                code: 'invalid_type',
            }),
        ]);
    });
});
