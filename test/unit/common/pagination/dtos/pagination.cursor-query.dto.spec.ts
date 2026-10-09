import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';

describe('PaginationCursorQuerySchema', () => {
    const payload = { cursor: 'eyJpZCI6IjE2In0', perPage: 20 };

    it('parses a payload into exactly the declared fields', () => {
        const result = PaginationCursorQuerySchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PaginationCursorQuerySchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string perPage into an integer', () => {
        const result = PaginationCursorQuerySchema.parse({
            ...payload,
            perPage: '20',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a non-integer perPage', () => {
        expect(() =>
            PaginationCursorQuerySchema.parse({ perPage: 1.5 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PaginationCursorQuerySchema.parse({ ...payload, page: 1 })
        ).toThrow();
    });

    it('accepts search and a single orderBy string', () => {
        const result = PaginationCursorQuerySchema.safeParse({
            search: 'jane',
            orderBy: 'createdAt:desc',
        });

        expect(result.success).toBe(true);
    });

    it('accepts orderBy repeated as an array', () => {
        const result = PaginationCursorQuerySchema.safeParse({
            orderBy: ['createdAt:desc', 'name:asc'],
        });

        expect(result.success).toBe(true);
    });

    it('rejects a non-string orderBy', () => {
        const result = PaginationCursorQuerySchema.safeParse({ orderBy: 1 });

        expect(result.success).toBe(false);
    });
});
