import { SessionCursorAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import { SessionSharedListRequestSchema } from '@modules/session/dtos/request/session.shared-list.request.dto';

describe('SessionSharedListRequestSchema', () => {
    const query = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        orderBy: 'createdAt:desc',
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

    it('keeps the module orderBy description', () => {
        expect(
            SessionSharedListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(SessionCursorAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = SessionCursorAvailableOrderBy[0];
        const last =
            SessionCursorAvailableOrderBy[
                SessionCursorAvailableOrderBy.length - 1
            ];

        expect(
            SessionSharedListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            SessionSharedListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${SessionCursorAvailableOrderBy[0]}:`,
        `${SessionCursorAvailableOrderBy[0]}:DESC`,
        `${SessionCursorAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            SessionSharedListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
