import { PasswordHistoryDefaultAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryAdminListRequestSchema } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';

describe('PasswordHistoryAdminListRequestSchema', () => {
    const payload = {
        page: 1,
        perPage: 20,
        orderBy: 'createdAt:desc',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'expiredAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'expiredAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PasswordHistoryAdminListRequestSchema.parse({
                ...payload,
                cursor: 'x',
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            PasswordHistoryAdminListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(PasswordHistoryDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = PasswordHistoryDefaultAvailableOrderBy[0];
        const last =
            PasswordHistoryDefaultAvailableOrderBy[
                PasswordHistoryDefaultAvailableOrderBy.length - 1
            ];

        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${PasswordHistoryDefaultAvailableOrderBy[0]}:`,
        `${PasswordHistoryDefaultAvailableOrderBy[0]}:DESC`,
        `${PasswordHistoryDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
