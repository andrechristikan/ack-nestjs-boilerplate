import { PaginationDefaultMaxSearchLength } from '@common/pagination/constants/pagination.constant';
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

    it('accepts search', () => {
        const result = PaginationCursorQuerySchema.safeParse({
            search: 'jane',
        });

        expect(result.success).toBe(true);
    });

    it.each(['createdAt:desc', ['createdAt:desc', 'name:asc'], 1])(
        'rejects an orderBy of %s because a list DTO declares its own allow-list',
        orderBy => {
            const result = PaginationCursorQuerySchema.safeParse({ orderBy });

            expect(result.success).toBe(false);
        }
    );

    it('trims a padded search', () => {
        const result = PaginationCursorQuerySchema.parse({
            search: '  jane  ',
        });

        expect(result).toEqual({ search: 'jane' });
    });

    it('accepts a search of exactly the maximum length', () => {
        const search = 'a'.repeat(PaginationDefaultMaxSearchLength);

        const result = PaginationCursorQuerySchema.safeParse({ search });

        expect(result.success).toBe(true);
    });

    it('rejects a search longer than the maximum length', () => {
        const search = 'a'.repeat(PaginationDefaultMaxSearchLength + 1);

        const result = PaginationCursorQuerySchema.safeParse({ search });

        expect(result.success).toBe(false);
    });
});
