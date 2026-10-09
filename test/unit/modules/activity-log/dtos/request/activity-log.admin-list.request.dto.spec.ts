import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
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

    it('rejects search', () => {
        expect(
            ActivityLogAdminListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            ActivityLogAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(ActivityLogDefaultAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = ActivityLogDefaultAvailableOrderBy[0];
        const last =
            ActivityLogDefaultAvailableOrderBy[
                ActivityLogDefaultAvailableOrderBy.length - 1
            ];

        expect(
            ActivityLogAdminListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            ActivityLogAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${ActivityLogDefaultAvailableOrderBy[0]}:`,
        `${ActivityLogDefaultAvailableOrderBy[0]}:DESC`,
        `${ActivityLogDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            ActivityLogAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
