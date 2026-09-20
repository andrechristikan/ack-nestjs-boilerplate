import { AnalyticCredentialStuffingListRequestSchema } from '@modules/analytic/dtos/request/analytic-credential-stuffing-list.request.dto';

describe('AnalyticCredentialStuffingListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({
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
        const result = AnalyticCredentialStuffingListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticCredentialStuffingListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
