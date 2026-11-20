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
        const result = SessionAdminListRequestSchema.safeParse({
            ...query,
            search: 'x',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an isRevoked value that is neither true nor false', () => {
        const result = SessionAdminListRequestSchema.safeParse({
            ...query,
            isRevoked: 'maybe',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isRevoked'],
                code: 'invalid_value',
            }),
        ]);
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
            SessionAdminListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            SessionAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
