import { PaginationOrderByQuerySchema } from '@common/pagination/dtos/pagination.order-by-query.dto';

describe('PaginationOrderByQuerySchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = { orderBy: 'newest' };

        const result = PaginationOrderByQuerySchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when orderBy is omitted', () => {
        const result = PaginationOrderByQuerySchema.parse({});

        expect(result).toEqual({});
    });
});
