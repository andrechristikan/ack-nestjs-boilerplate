import { AnalyticAccountTakeoverListRequestSchema } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';
import { EnumAnalyticAccountTakeoverOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticAccountTakeoverListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticAccountTakeoverListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticAccountTakeoverListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs and the date range', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                windowMs: 1000,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticAccountTakeoverListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({ search: 'x' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(
            Object.values(EnumAnalyticAccountTakeoverOrderBy).join(', ')
        );
    });

    it.each(Object.values(EnumAnalyticAccountTakeoverOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticAccountTakeoverListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'passwordChangedAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({ orderBy })
                .error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticAccountTakeoverListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
