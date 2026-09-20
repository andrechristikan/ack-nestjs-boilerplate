import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

describe('PaginationOffsetQuerySchema', () => {
    it('includes page and perPage only', () => {
        const keys = Object.keys(PaginationOffsetQuerySchema.shape);

        expect(keys).toEqual(['page', 'perPage']);
    });

    it('omits search, orderBy, and cursor', () => {
        const keys = Object.keys(PaginationOffsetQuerySchema.shape);

        expect(keys).not.toContain('search');
        expect(keys).not.toContain('orderBy');
        expect(keys).not.toContain('cursor');
    });

    it('accepts empty query', () => {
        expect(PaginationOffsetQuerySchema.parse({})).toEqual({});
    });

    it('coerces page and perPage to numbers', () => {
        expect(
            PaginationOffsetQuerySchema.parse({ page: '2', perPage: '10' })
        ).toEqual({ page: 2, perPage: 10 });
    });
});
