import { AnalyticTermPolicyAcceptanceRateCacheSchema } from '@modules/analytic/dtos/analytic.term-policy-acceptance-rate-cache.dto';

describe('AnalyticTermPolicyAcceptanceRateCacheSchema', () => {
    const payload = {
        acceptances: 1,
        users: 2,
        published: 3,
        rate: 4,
        undeclared: 'extra',
    };
    const expected = { acceptances: 1, users: 2, published: 3, rate: 4 };
    const invalid = { acceptances: 'text', users: 2, published: 3, rate: 4 };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticTermPolicyAcceptanceRateCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with acceptances of the wrong type', () => {
        const result =
            AnalyticTermPolicyAcceptanceRateCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['acceptances'],
                code: 'invalid_type',
            }),
        ]);
    });
});
