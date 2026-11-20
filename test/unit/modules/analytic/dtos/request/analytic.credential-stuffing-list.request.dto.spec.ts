import { AnalyticCredentialStuffingListRequestSchema } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';
import { EnumAnalyticCredentialStuffingOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticCredentialStuffingListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'mostUsers',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'mostUsers',
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs and the date range', () => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                windowMs: 1000,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                search: 'x',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(
            Object.values(EnumAnalyticCredentialStuffingOrderBy).join(', ')
        );
    });

    it.each(Object.values(EnumAnalyticCredentialStuffingOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticCredentialStuffingListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'mostUsers:asc',
        'default',
        'createdAt',
        'uniqueUsers',
        'failCount',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({ orderBy })
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
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                orderBy: ['mostUsers', 'mostUsers'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
