import { AnalyticMfaAdoptionResponseSchema } from '@modules/analytic/dtos/response/analytic.mfa-adoption.response.dto';

describe('AnalyticMfaAdoptionResponseSchema', () => {
    const row = {
        enabled: 3,
        total: 9,
        rate: 0.33,
        computedAt: new Date('2026-03-01T00:00:00.000Z'),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticMfaAdoptionResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticMfaAdoptionResponseSchema.parse({
            ...row,
            secret: 'totp-secret',
        });

        expect(result).toEqual(row);
    });

    it('describes the rate on a 0-100 scale', () => {
        expect(
            AnalyticMfaAdoptionResponseSchema.shape.rate.meta()?.description
        ).toContain('0-100');
    });

    it('accepts a null computedAt', () => {
        const result = AnalyticMfaAdoptionResponseSchema.parse({
            ...row,
            computedAt: null,
        });

        expect(result.computedAt).toBeNull();
    });

    it('rejects an absent computedAt', () => {
        const { computedAt: _computedAt, ...rest } = row;

        expect(
            AnalyticMfaAdoptionResponseSchema.safeParse(rest).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });
});
