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
});
