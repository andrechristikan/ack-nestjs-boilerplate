import { PaginationCursorListQuerySchema } from '@common/pagination/dtos/pagination.cursor-list-query.dto';

describe('PaginationCursorListQuerySchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        search: 'john',
        orderBy: 'createdAt:desc',
    };

    it('parses a full query into exactly the declared fields', () => {
        const result = PaginationCursorListQuerySchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty query when every field is omitted', () => {
        const result = PaginationCursorListQuerySchema.parse({});

        expect(result).toEqual({});
    });

    it('keeps a string orderBy as a string', () => {
        const result = PaginationCursorListQuerySchema.parse({
            orderBy: 'createdAt:asc',
        });

        expect(result.orderBy).toBe('createdAt:asc');
    });

    it('keeps an array orderBy as an array', () => {
        const result = PaginationCursorListQuerySchema.parse({
            orderBy: ['createdAt:asc', 'name:desc'],
        });

        expect(result.orderBy).toEqual(['createdAt:asc', 'name:desc']);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PaginationCursorListQuerySchema.parse({ ...payload, page: 1 })
        ).toThrow();
    });
});
