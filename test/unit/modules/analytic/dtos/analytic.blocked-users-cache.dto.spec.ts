import { AnalyticBlockedUsersCacheSchema } from '@modules/analytic/dtos/analytic.blocked-users-cache.dto';

describe('AnalyticBlockedUsersCacheSchema', () => {
    const payload = { trend: 1, current: 2, undeclared: 'extra' };
    const expected = { trend: 1, current: 2 };
    const invalid = { trend: 'text', current: 2 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticBlockedUsersCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with trend of the wrong type', () => {
        const result = AnalyticBlockedUsersCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['trend'],
                code: 'invalid_type',
            }),
        ]);
    });
});
