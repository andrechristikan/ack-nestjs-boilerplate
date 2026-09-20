import { AnalyticPasswordResetEnumerationListRequestSchema } from '@modules/analytic/dtos/request/analytic-password-reset-enumeration-list.request.dto';

describe('AnalyticPasswordResetEnumerationListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse({
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
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse(
            {}
        );

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticPasswordResetEnumerationListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticPasswordResetEnumerationListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
