import { AnalyticForgotPasswordConversionResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-conversion.response.dto';

describe('AnalyticForgotPasswordConversionResponseSchema', () => {
    const row = { created: 5, used: 2, rate: 0.4 };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticForgotPasswordConversionResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticForgotPasswordConversionResponseSchema.parse({
            ...row,
            token: 'secret-token',
        });

        expect(result).toEqual(row);
    });
});
