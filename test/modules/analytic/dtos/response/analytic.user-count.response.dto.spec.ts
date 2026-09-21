import { AnalyticUserCountResponseSchema } from '@modules/analytic/dtos/response/analytic.user-count.response.dto';

describe('AnalyticUserCountResponseSchema', () => {
    const row = {
        userId: 'user-1',
        count: 31,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticUserCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticUserCountResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
