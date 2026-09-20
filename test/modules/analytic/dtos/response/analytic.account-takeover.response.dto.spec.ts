import { AnalyticAccountTakeoverResponseSchema } from '@modules/analytic/dtos/response/analytic.account-takeover.response.dto';

describe('AnalyticAccountTakeoverResponseSchema', () => {
    const passwordChangedAt = new Date('2026-01-02T03:04:05.000Z');

    const row = {
        userId: 'user-1',
        indicatorCodes: ['passwordChanged', 'newDevice'],
        passwordChangedAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticAccountTakeoverResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects a passwordChangedAt that is not a Date', () => {
        expect(() =>
            AnalyticAccountTakeoverResponseSchema.parse({
                ...row,
                passwordChangedAt: passwordChangedAt.toISOString(),
            })
        ).toThrow();
    });

    it('strips an undeclared key', () => {
        const result = AnalyticAccountTakeoverResponseSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
    });
});
