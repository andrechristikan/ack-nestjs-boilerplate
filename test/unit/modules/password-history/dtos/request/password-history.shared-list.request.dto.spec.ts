import { PasswordHistorySharedListRequestSchema } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import { EnumPasswordHistoryCursorOrderBy } from '@modules/password-history/enums/password-history.enum';

describe('PasswordHistorySharedListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'latest',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PasswordHistorySharedListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PasswordHistorySharedListRequestSchema.parse({});

        expect(result).toEqual({});
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            PasswordHistorySharedListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumPasswordHistoryCursorOrderBy).join(', '));
    });

    it.each(Object.values(EnumPasswordHistoryCursorOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                PasswordHistorySharedListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            PasswordHistorySharedListRequestSchema.safeParse({ orderBy: '' })
                .success
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
            PasswordHistorySharedListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            PasswordHistorySharedListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
