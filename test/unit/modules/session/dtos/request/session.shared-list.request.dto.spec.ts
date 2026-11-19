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
        expect(() =>
            SessionSharedListRequestSchema.parse({ ...query, page: 1 })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            SessionSharedListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
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
            SessionSharedListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            SessionSharedListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
