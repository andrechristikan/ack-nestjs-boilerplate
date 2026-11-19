import { SessionAdminListRequestSchema } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { EnumSessionOrderBy } from '@modules/session/enums/session.enum';

describe('SessionAdminListRequestSchema', () => {
    const query = {
        page: 1,
        perPage: 20,
        orderBy: 'latest',
        isRevoked: 'true',
    };

    it('parses a query into exactly the declared fields', () => {
        const result = SessionAdminListRequestSchema.parse(query);

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
            isRevoked: true,
        });
    });

    it('parses an empty query', () => {
        const result = SessionAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            SessionAdminListRequestSchema.parse({ ...query, search: 'x' })
        ).toThrow();
    });

    it('rejects an isRevoked value that is neither true nor false', () => {
        expect(() =>
            SessionAdminListRequestSchema.parse({
                ...query,
                isRevoked: 'maybe',
            })
        ).toThrow();
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            SessionAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumSessionOrderBy).join(', '));
    });

    it.each(Object.values(EnumSessionOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                SessionAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            SessionAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'updatedAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            SessionAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            SessionAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
