import { AnalyticWorkspacesActivityVolumeListRequestSchema } from '@modules/analytic/dtos/request/analytic-workspaces-activity-volume-list.request.dto';

describe('AnalyticWorkspacesActivityVolumeListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

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
});
