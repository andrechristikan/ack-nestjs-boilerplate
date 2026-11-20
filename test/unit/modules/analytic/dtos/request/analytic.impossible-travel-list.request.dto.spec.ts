import { AnalyticImpossibleTravelListRequestSchema } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import { EnumAnalyticImpossibleTravelOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticImpossibleTravelListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticImpossibleTravelListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'highestValue',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'highestValue',
        });
    });

    it('parses an empty object', () => {
        expect(AnalyticImpossibleTravelListRequestSchema.parse({})).toEqual({});
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticImpossibleTravelListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search, windowMs, and the date range', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ search: 'x' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({
                windowMs: 1000,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it.each([
        'unknownField:asc',
        'runId:asc',
        'userCount:desc',
        'value:',
        'value:DESC',
        'value:up',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ orderBy })
                .error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(
            Object.values(EnumAnalyticImpossibleTravelOrderBy).join(', ')
        );
    });

    it.each(Object.values(EnumAnalyticImpossibleTravelOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticImpossibleTravelListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts the recent preset', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({
                orderBy: 'recent',
            }).success
        ).toBe(true);
    });

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'highestValue:asc',
        'default',
        'createdAt',
        'value',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticImpossibleTravelListRequestSchema.safeParse({ orderBy })
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
            AnalyticImpossibleTravelListRequestSchema.safeParse({
                orderBy: ['highestValue', 'highestValue'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
