import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';
import { NotificationListRequestSchema } from '@modules/notification/dtos/request/notification.list.request.dto';

describe('NotificationListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'createdAt:desc',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = NotificationListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = NotificationListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = NotificationListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            NotificationListRequestSchema.parse({ ...payload, page: 1 })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            NotificationListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            NotificationListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(NotificationDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            NotificationListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = NotificationDefaultAvailableOrderBy[0];
        const last =
            NotificationDefaultAvailableOrderBy[
                NotificationDefaultAvailableOrderBy.length - 1
            ];

        expect(
            NotificationListRequestSchema.safeParse({ orderBy: `${first}:asc` })
                .success
        ).toBe(true);
        expect(
            NotificationListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${NotificationDefaultAvailableOrderBy[0]}:`,
        `${NotificationDefaultAvailableOrderBy[0]}:DESC`,
        `${NotificationDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            NotificationListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
