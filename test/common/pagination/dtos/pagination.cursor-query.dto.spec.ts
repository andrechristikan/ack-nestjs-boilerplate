import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';

describe('PaginationCursorQuerySchema', () => {
    it('includes cursor and perPage only', () => {
        const keys = Object.keys(PaginationCursorQuerySchema.shape);

        expect(keys).toEqual(['cursor', 'perPage']);
    });

    it('omits search, orderBy, and page', () => {
        const keys = Object.keys(PaginationCursorQuerySchema.shape);

        expect(keys).not.toContain('search');
        expect(keys).not.toContain('orderBy');
        expect(keys).not.toContain('page');
    });

    it('accepts empty query', () => {
        expect(PaginationCursorQuerySchema.parse({})).toEqual({});
    });

    it('coerces perPage to a number', () => {
        expect(
            PaginationCursorQuerySchema.parse({
                cursor: 'abc',
                perPage: '10',
            })
        ).toEqual({ cursor: 'abc', perPage: 10 });
    });
});
