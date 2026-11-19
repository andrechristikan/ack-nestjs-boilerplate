import { AnalyticRefreshSpikeListRequestSchema } from '@modules/analytic/dtos/request/analytic.refresh-spike-list.request.dto';
import { EnumAnalyticUserCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticRefreshSpikeListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticRefreshSpikeListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'mostCount',
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'mostCount',
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticRefreshSpikeListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticRefreshSpikeListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticRefreshSpikeListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticUserCountOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticUserCountOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticRefreshSpikeListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'mostCount:asc',
        'default',
        'createdAt',
        'count',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticRefreshSpikeListRequestSchema.safeParse({
                orderBy: ['mostCount', 'mostCount'],
            }).success
        ).toBe(false);
    });
});
