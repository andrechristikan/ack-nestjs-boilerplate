import { AnalyticLoginSpikeIpListRequestSchema } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import { EnumAnalyticLoginSpikeIpOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticLoginSpikeIpListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({
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
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects windowMs and the date range', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ windowMs: 1000 })
                .success
        ).toBe(false);
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).success
        ).toBe(false);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticLoginSpikeIpListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticLoginSpikeIpOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticLoginSpikeIpOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticLoginSpikeIpListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'mostUsers:asc',
        'default',
        'createdAt',
        'uniqueUsers',
        'attempts',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({
                orderBy: ['mostUsers', 'mostUsers'],
            }).success
        ).toBe(false);
    });
});
