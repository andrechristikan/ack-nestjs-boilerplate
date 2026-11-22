import { AnalyticActiveUsersCacheSchema } from '@modules/analytic/dtos/analytic.active-users-cache.dto';

describe('AnalyticActiveUsersCacheSchema', () => {
    const payload = {
        daily: 1,
        weekly: 2,
        monthly: 3,
        windowEnd: '2026-01-02T03:04:05.000Z',
        computedAt: '2026-01-02T03:04:05.000Z',
        undeclared: 'extra',
    };
    const expected = {
        daily: 1,
        weekly: 2,
        monthly: 3,
        windowEnd: new Date('2026-01-02T03:04:05.000Z'),
        computedAt: new Date('2026-01-02T03:04:05.000Z'),
    };
    const invalid = {
        daily: 'text',
        weekly: 2,
        monthly: 3,
        windowEnd: '2026-01-02T03:04:05.000Z',
        computedAt: '2026-01-02T03:04:05.000Z',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticActiveUsersCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with daily of the wrong type', () => {
        const result = AnalyticActiveUsersCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['daily'],
                code: 'invalid_type',
            }),
        ]);
    });
});
