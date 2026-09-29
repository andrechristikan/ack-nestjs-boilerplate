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
});
