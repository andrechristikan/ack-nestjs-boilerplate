import { AnalyticForgotPasswordAbuseResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-abuse.response.dto';

describe('AnalyticForgotPasswordAbuseResponseSchema', () => {
    const row = {
        userId: 'user-1',
        tokenCount: 7,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticForgotPasswordAbuseResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticForgotPasswordAbuseResponseSchema.parse({
            ...row,
            token: 'forgot-password-token',
        });

        expect(result).toEqual(row);
    });
});
