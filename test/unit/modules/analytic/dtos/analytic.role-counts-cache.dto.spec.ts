import { AnalyticRoleCountsCacheSchema } from '@modules/analytic/dtos/analytic.role-counts-cache.dto';

describe('AnalyticRoleCountsCacheSchema', () => {
    const payload = [{ role: 'role-1', count: 1, undeclared: 'extra' }];
    const expected = [{ role: 'role-1', count: 1 }];
    const invalid = [{ role: 123, count: 1 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticRoleCountsCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.role of the wrong type', () => {
        const result = AnalyticRoleCountsCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'role'],
                code: 'invalid_type',
            }),
        ]);
    });
});
