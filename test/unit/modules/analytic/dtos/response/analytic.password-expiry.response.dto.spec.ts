import { AnalyticPasswordExpiryResponseSchema } from '@modules/analytic/dtos/response/analytic.password-expiry.response.dto';

describe('AnalyticPasswordExpiryResponseSchema', () => {
    const row = { expired: 2, total: 10, compliant: 8, rate: 0.8 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticPasswordExpiryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticPasswordExpiryResponseSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
    });
});
