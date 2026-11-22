import { AnalyticApiKeyActiveExpiredCacheSchema } from '@modules/analytic/dtos/analytic.api-key-active-expired-cache.dto';

describe('AnalyticApiKeyActiveExpiredCacheSchema', () => {
    const payload = { active: 1, expired: 2, inactive: 3, undeclared: 'extra' };
    const expected = { active: 1, expired: 2, inactive: 3 };
    const invalid = { active: 'text', expired: 2, inactive: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticApiKeyActiveExpiredCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with active of the wrong type', () => {
        const result =
            AnalyticApiKeyActiveExpiredCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['active'],
                code: 'invalid_type',
            }),
        ]);
    });
});
