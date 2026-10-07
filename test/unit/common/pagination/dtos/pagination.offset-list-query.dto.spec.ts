import { PaginationOffsetListQuerySchema } from '@common/pagination/dtos/pagination.offset-list-query.dto';

describe('PaginationOffsetListQuerySchema', () => {
    const payload = {
        page: 1,
        perPage: 20,
        search: 'john',
        orderBy: 'createdAt:desc',
    };

    it('parses a full query into exactly the declared fields', () => {
        const result = PaginationOffsetListQuerySchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty query when every field is omitted', () => {
        const result = PaginationOffsetListQuerySchema.parse({});

        expect(result).toEqual({});
    });

    it('keeps a string orderBy as a string', () => {
        const result = PaginationOffsetListQuerySchema.parse({
            orderBy: 'createdAt:asc',
        });

        expect(result.orderBy).toBe('createdAt:asc');
    });

    it('keeps an array orderBy as an array', () => {
        const result = PaginationOffsetListQuerySchema.parse({
            orderBy: ['createdAt:asc', 'name:desc'],
        });

        expect(result.orderBy).toEqual(['createdAt:asc', 'name:desc']);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PaginationOffsetListQuerySchema.parse({ ...payload, cursor: 'x' })
        ).toThrow();
    });
});
