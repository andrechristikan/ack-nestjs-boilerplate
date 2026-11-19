import { ActivityLogAdminListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import { EnumActivityLogOrderBy } from '@modules/activity-log/enums/activity-log.enum';

describe('ActivityLogAdminListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = ActivityLogAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });
    });

    it('parses with no field set', () => {
        const result = ActivityLogAdminListRequestSchema.parse({});

        expect(result).toEqual({});
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ActivityLogAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumActivityLogOrderBy).join(', '));
    });

    it.each(Object.values(EnumActivityLogOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                ActivityLogAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            ActivityLogAdminListRequestSchema.safeParse({ orderBy: '' }).success
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
            ActivityLogAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ActivityLogAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
