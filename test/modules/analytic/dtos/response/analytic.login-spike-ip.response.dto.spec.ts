import { AnalyticLoginSpikeIpResponseSchema } from '@modules/analytic/dtos/response/analytic.login-spike-ip.response.dto';

describe('AnalyticLoginSpikeIpResponseSchema', () => {
    const row = {
        ipAddress: '10.0.0.1',
        uniqueUsers: 12,
        attempts: 340,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticLoginSpikeIpResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticLoginSpikeIpResponseSchema.parse({
            ...row,
            userAgent: 'curl',
        });

        expect(result).toEqual(row);
    });
});
