import { AnalyticMetricRateResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-rate.response.dto';

describe('AnalyticMetricRateResponseSchema', () => {
    const row = { count: 4, total: 10, rate: 0.4 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticMetricRateResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticMetricRateResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
