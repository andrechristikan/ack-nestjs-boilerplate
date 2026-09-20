import { AnalyticMetricCountResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';

describe('AnalyticMetricCountResponseSchema', () => {
    const row = { count: 12 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticMetricCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticMetricCountResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
