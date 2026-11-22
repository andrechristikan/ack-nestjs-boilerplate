import { AnalyticForgotPasswordConversionCacheSchema } from '@modules/analytic/dtos/analytic.forgot-password-conversion-cache.dto';

describe('AnalyticForgotPasswordConversionCacheSchema', () => {
    const payload = { created: 1, used: 2, rate: 3, undeclared: 'extra' };
    const expected = { created: 1, used: 2, rate: 3 };
    const invalid = { created: 'text', used: 2, rate: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticForgotPasswordConversionCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with created of the wrong type', () => {
        const result =
            AnalyticForgotPasswordConversionCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['created'],
                code: 'invalid_type',
            }),
        ]);
    });
});
