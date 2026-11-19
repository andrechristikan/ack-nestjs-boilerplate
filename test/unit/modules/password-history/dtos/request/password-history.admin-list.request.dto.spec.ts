import { PasswordHistoryAdminListRequestSchema } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import { EnumPasswordHistoryOrderBy } from '@modules/password-history/enums/password-history.enum';

describe('PasswordHistoryAdminListRequestSchema', () => {
    const payload = {
        page: 1,
        perPage: 20,
        orderBy: 'latest',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PasswordHistoryAdminListRequestSchema.parse({});

        expect(result).toEqual({});
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            PasswordHistoryAdminListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumPasswordHistoryOrderBy).join(', '));
    });

    it.each(Object.values(EnumPasswordHistoryOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                PasswordHistoryAdminListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'expiredAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            PasswordHistoryAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
