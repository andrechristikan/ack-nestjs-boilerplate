import { AnalyticRoleCountResponseSchema } from '@modules/analytic/dtos/response/analytic.role-count.response.dto';

describe('AnalyticRoleCountResponseSchema', () => {
    const row = { roles: [{ role: 'admin', count: 2 }] };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticRoleCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticRoleCountResponseSchema.parse({
            ...row,
            userId: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
