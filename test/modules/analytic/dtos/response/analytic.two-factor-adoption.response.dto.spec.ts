import { AnalyticTwoFactorAdoptionResponseSchema } from '@modules/analytic/dtos/response/analytic.two-factor-adoption.response.dto';

describe('AnalyticTwoFactorAdoptionResponseSchema', () => {
    const row = { enabled: 3, total: 9, rate: 0.33 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticTwoFactorAdoptionResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticTwoFactorAdoptionResponseSchema.parse({
            ...row,
            secret: 'totp-secret',
        });

        expect(result).toEqual(row);
    });
});
