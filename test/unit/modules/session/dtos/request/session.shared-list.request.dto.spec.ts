import { SessionSharedListRequestSchema } from '@modules/session/dtos/request/session.shared-list.request.dto';
import { EnumSessionCursorOrderBy } from '@modules/session/enums/session.enum';

describe('SessionSharedListRequestSchema', () => {
    const query = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'latest',
    };

    it('parses a query into exactly the declared fields', () => {
        const result = SessionSharedListRequestSchema.parse(query);

        expect(result).toEqual(query);
    });

    it('parses an empty query', () => {
        const result = SessionSharedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        const result = SessionSharedListRequestSchema.safeParse({
            ...query,
            page: 1,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            SessionSharedListRequestSchema.safeParse({ search: 'x' }).error
                ?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            SessionSharedListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumSessionCursorOrderBy).join(', '));
    });

    it.each(Object.values(EnumSessionCursorOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                SessionSharedListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            SessionSharedListRequestSchema.safeParse({ orderBy: '' }).success
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
            SessionSharedListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            SessionSharedListRequestSchema.safeParse({
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
