import { AnalyticSharedFingerprintListRequestSchema } from '@modules/analytic/dtos/request/analytic-shared-fingerprint-list.request.dto';

describe('AnalyticSharedFingerprintListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticSharedFingerprintListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses an orderBy array', () => {
        const result = AnalyticSharedFingerprintListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'id:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'id:asc'] });
    });

    it('parses an empty object', () => {
        const result = AnalyticSharedFingerprintListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticSharedFingerprintListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
