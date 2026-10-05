import { AnalyticVerificationFunnelResponseSchema } from '@modules/analytic/dtos/response/analytic.verification-funnel.response.dto';

describe('AnalyticVerificationFunnelResponseSchema', () => {
    const row = {
        email: { used: 1, unused: 2, total: 3, rate: 0.33 },
        mobile: { used: 4, unused: 1, total: 5, rate: 0.8 },
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticVerificationFunnelResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticVerificationFunnelResponseSchema.parse({
            ...row,
            token: 'verification-token',
        });

        expect(result).toEqual(row);
    });
});
