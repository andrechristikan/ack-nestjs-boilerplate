import { AnalyticLoginTimeAnomalyResponseSchema } from '@modules/analytic/dtos/response/analytic.login-time-anomaly.response.dto';

describe('AnalyticLoginTimeAnomalyResponseSchema', () => {
    const row = {
        userId: 'user-1',
        lastHour: 3,
        historicalFrequencyPercent: 1.25,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticLoginTimeAnomalyResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticLoginTimeAnomalyResponseSchema.parse({
            ...row,
            ipAddress: '10.0.0.1',
        });

        expect(result).toEqual(row);
    });
});
