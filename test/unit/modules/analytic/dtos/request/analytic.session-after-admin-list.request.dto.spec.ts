import { AnalyticSessionAfterAdminListRequestSchema } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';
import { EnumAnalyticSessionAfterAdminOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticSessionAfterAdminListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticSessionAfterAdminListRequestSchema.parse({
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
        const result = AnalyticSessionAfterAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs and the date range', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                windowMs: 1000,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticSessionAfterAdminListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                search: 'x',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(
            Object.values(EnumAnalyticSessionAfterAdminOrderBy).join(', ')
        );
    });

    it.each(Object.values(EnumAnalyticSessionAfterAdminOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticSessionAfterAdminListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
                orderBy: '',
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'revokedAt',
        'loginAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticSessionAfterAdminListRequestSchema.safeParse({ orderBy })
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
            AnalyticSessionAfterAdminListRequestSchema.safeParse({
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
