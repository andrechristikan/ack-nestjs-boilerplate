import { AnalyticSharedFingerprintAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticSharedFingerprintListRequestSchema } from '@modules/analytic/dtos/request/analytic.shared-fingerprint-list.request.dto';

describe('AnalyticSharedFingerprintListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticSharedFingerprintListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticSharedFingerprintAvailableOrderBy[0]}:desc`,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticSharedFingerprintAvailableOrderBy[0]}:desc`,
        });
    });

    it('parses an orderBy array', () => {
        const result = AnalyticSharedFingerprintListRequestSchema.parse({
            orderBy: [
                `${AnalyticSharedFingerprintAvailableOrderBy[0]}:desc`,
                `${AnalyticSharedFingerprintAvailableOrderBy[1]}:asc`,
            ],
        });

        expect(result).toEqual({
            orderBy: [
                `${AnalyticSharedFingerprintAvailableOrderBy[0]}:desc`,
                `${AnalyticSharedFingerprintAvailableOrderBy[1]}:asc`,
            ],
        });
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

    it('rejects search', () => {
        expect(
            AnalyticSharedFingerprintListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticSharedFingerprintListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticSharedFingerprintAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticSharedFingerprintAvailableOrderBy[0];
        const last =
            AnalyticSharedFingerprintAvailableOrderBy[
                AnalyticSharedFingerprintAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticSharedFingerprintListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticSharedFingerprintListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticSharedFingerprintAvailableOrderBy[0]}:`,
        `${AnalyticSharedFingerprintAvailableOrderBy[0]}:DESC`,
        `${AnalyticSharedFingerprintAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticSharedFingerprintListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
