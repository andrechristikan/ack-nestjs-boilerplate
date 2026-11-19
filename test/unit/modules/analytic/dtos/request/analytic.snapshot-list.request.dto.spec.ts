import { AnalyticSnapshotListRequestSchema } from '@modules/analytic/dtos/request/analytic.snapshot-list.request.dto';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticSnapshotListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticSnapshotListRequestSchema.parse({
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
        expect(AnalyticSnapshotListRequestSchema.parse({})).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticSnapshotListRequestSchema.parse({ page: 1, extra: true })
        ).toThrow();
    });

    it('rejects search, windowMs, and the date range', () => {
        expect(
            AnalyticSnapshotListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
        expect(
            AnalyticSnapshotListRequestSchema.safeParse({ windowMs: 1000 })
                .success
        ).toBe(false);
        expect(
            AnalyticSnapshotListRequestSchema.safeParse({
                startDate: '2026-01-01T00:00:00.000Z',
            }).success
        ).toBe(false);
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
            AnalyticSnapshotListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticSnapshotListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumAnalyticSnapshotOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticSnapshotOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticSnapshotListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticSnapshotListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'highestValue:asc',
        'default',
        'createdAt',
        'value',
        'occurredAt',
        'recent',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticSnapshotListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticSnapshotListRequestSchema.safeParse({
                orderBy: ['highestValue', 'highestValue'],
            }).success
        ).toBe(false);
    });
});
