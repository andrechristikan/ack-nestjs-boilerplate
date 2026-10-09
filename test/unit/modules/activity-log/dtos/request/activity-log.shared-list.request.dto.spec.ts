import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogSharedListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';

describe('ActivityLogSharedListRequestSchema', () => {
    it('parses cursor, perPage, and orderBy', () => {
        const result = ActivityLogSharedListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses with no field set', () => {
        const result = ActivityLogSharedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = ActivityLogSharedListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogSharedListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            ActivityLogSharedListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            ActivityLogSharedListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(ActivityLogDefaultAvailableOrderBy.join(', '));
    });
});
