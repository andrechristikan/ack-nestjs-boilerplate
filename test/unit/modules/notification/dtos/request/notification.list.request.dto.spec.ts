import { NotificationListRequestSchema } from '@modules/notification/dtos/request/notification.list.request.dto';
import { EnumNotificationOrderBy } from '@modules/notification/enums/notification.enum';

describe('NotificationListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'latest',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = NotificationListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = NotificationListRequestSchema.parse({});

        expect(result).toEqual({});
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            NotificationListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumNotificationOrderBy).join(', '));
    });

    it.each(Object.values(EnumNotificationOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                NotificationListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            NotificationListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            NotificationListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            NotificationListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
