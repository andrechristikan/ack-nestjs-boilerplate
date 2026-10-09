import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import { SessionAdminListRequestSchema } from '@modules/session/dtos/request/session.admin-list.request.dto';

describe('SessionAdminListRequestSchema', () => {
    const query = {
        page: 1,
        perPage: 20,
        orderBy: 'createdAt:desc',
        isRevoked: 'true',
    };

    it('parses a query into exactly the declared fields', () => {
        const result = SessionAdminListRequestSchema.parse(query);

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
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

    it('keeps the module orderBy description', () => {
        expect(
            SessionAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(SessionDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            SessionAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = SessionDefaultAvailableOrderBy[0];
        const last =
            SessionDefaultAvailableOrderBy[
                SessionDefaultAvailableOrderBy.length - 1
            ];

        expect(
            SessionAdminListRequestSchema.safeParse({ orderBy: `${first}:asc` })
                .success
        ).toBe(true);
        expect(
            SessionAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${SessionDefaultAvailableOrderBy[0]}:`,
        `${SessionDefaultAvailableOrderBy[0]}:DESC`,
        `${SessionDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            SessionAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
