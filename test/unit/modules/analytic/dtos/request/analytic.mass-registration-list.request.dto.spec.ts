import { AnalyticKeyCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticMassRegistrationListRequestSchema } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';

describe('AnalyticMassRegistrationListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticMassRegistrationListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticMassRegistrationListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticMassRegistrationListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticKeyCountAvailableOrderBy.join(', '));
    });
});
