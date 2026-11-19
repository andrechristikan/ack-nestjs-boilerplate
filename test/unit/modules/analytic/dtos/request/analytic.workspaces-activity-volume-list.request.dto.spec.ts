import { AnalyticWorkspacesActivityVolumeListRequestSchema } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticWorkspacesActivityVolumeListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const range = { startDate, endDate };

    it('parses page, perPage, and the date range', () => {
        const result = AnalyticWorkspacesActivityVolumeListRequestSchema.parse({
            page: 1,
            perPage: 20,
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            startDate,
            endDate,
        });
    });

    it('coerces ISO strings into Date values', () => {
        const result = AnalyticWorkspacesActivityVolumeListRequestSchema.parse({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        expect(result).toEqual({ startDate, endDate });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticWorkspacesActivityVolumeListRequestSchema.parse({
                startDate,
                endDate,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticWorkspacesActivityVolumeListRequestSchema.safeParse({
                ...range,
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('parses a sent orderBy', () => {
        const result = AnalyticWorkspacesActivityVolumeListRequestSchema.parse({
            ...range,
            orderBy: 'mostCount',
        });

        expect(result).toMatchObject({ orderBy: 'mostCount' });
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticWorkspacesActivityVolumeListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticCountOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticCountOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticWorkspacesActivityVolumeListRequestSchema.safeParse({
                    ...range,
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticWorkspacesActivityVolumeListRequestSchema.safeParse({
                ...range,
                orderBy: '',
            }).success
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
            AnalyticWorkspacesActivityVolumeListRequestSchema.safeParse({
                ...range,
                orderBy,
            }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticWorkspacesActivityVolumeListRequestSchema.safeParse({
                ...range,
                orderBy: ['mostCount', 'mostCount'],
            }).success
        ).toBe(false);
    });
});
