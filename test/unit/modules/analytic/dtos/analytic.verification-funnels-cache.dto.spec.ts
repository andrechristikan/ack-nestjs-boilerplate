import { AnalyticVerificationFunnelsCacheSchema } from '@modules/analytic/dtos/analytic.verification-funnels-cache.dto';

describe('AnalyticVerificationFunnelsCacheSchema', () => {
    const payload = {
        email: { used: 1, unused: 2, total: 3, rate: 4 },
        mobile: { used: 5, unused: 6, total: 7, rate: 8 },
        undeclared: 'extra',
    };
    const expected = {
        email: { used: 1, unused: 2, total: 3, rate: 4 },
        mobile: { used: 5, unused: 6, total: 7, rate: 8 },
    };
    const invalid = {
        email: { used: 'text', unused: 2, total: 3, rate: 4 },
        mobile: { used: 5, unused: 6, total: 7, rate: 8 },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticVerificationFunnelsCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with email.used of the wrong type', () => {
        const result =
            AnalyticVerificationFunnelsCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['email', 'used'],
                code: 'invalid_type',
            }),
        ]);
    });
});
