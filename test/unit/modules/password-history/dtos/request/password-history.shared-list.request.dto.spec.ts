import { PasswordHistoryCursorAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistorySharedListRequestSchema } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';

describe('PasswordHistorySharedListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'createdAt:desc',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PasswordHistorySharedListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PasswordHistorySharedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an array of orderBy fields', () => {
        const result = PasswordHistorySharedListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:desc', 'createdAt:asc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PasswordHistorySharedListRequestSchema.parse({
                ...payload,
                page: 1,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            PasswordHistorySharedListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            PasswordHistorySharedListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(PasswordHistoryCursorAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            PasswordHistorySharedListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = PasswordHistoryCursorAvailableOrderBy[0];
        const last =
            PasswordHistoryCursorAvailableOrderBy[
                PasswordHistoryCursorAvailableOrderBy.length - 1
            ];

        expect(
            PasswordHistorySharedListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            PasswordHistorySharedListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${PasswordHistoryCursorAvailableOrderBy[0]}:`,
        `${PasswordHistoryCursorAvailableOrderBy[0]}:DESC`,
        `${PasswordHistoryCursorAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            PasswordHistorySharedListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
