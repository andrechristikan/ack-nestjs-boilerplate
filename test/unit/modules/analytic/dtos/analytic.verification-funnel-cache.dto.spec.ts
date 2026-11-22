import { AnalyticVerificationFunnelCacheSchema } from '@modules/analytic/dtos/analytic.verification-funnel-cache.dto';

describe('AnalyticVerificationFunnelCacheSchema', () => {
    const payload = {
        used: 1,
        unused: 2,
        total: 3,
        rate: 4,
        undeclared: 'extra',
    };
    const expected = { used: 1, unused: 2, total: 3, rate: 4 };
    const invalid = { used: 'text', unused: 2, total: 3, rate: 4 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticVerificationFunnelCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with used of the wrong type', () => {
        const result = AnalyticVerificationFunnelCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['used'],
                code: 'invalid_type',
            }),
        ]);
    });
});
