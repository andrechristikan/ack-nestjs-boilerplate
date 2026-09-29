import { ActivityLogAdminListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';

describe('ActivityLogAdminListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = ActivityLogAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses with no field set', () => {
        const result = ActivityLogAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = ActivityLogAdminListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogAdminListRequestSchema.parse({ extra: true })
        ).toThrow();
    });
});
