import { PaginationDefaultMaxSearchLength } from '@common/pagination/constants/pagination.constant';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

describe('PaginationOffsetQuerySchema', () => {
    const payload = { page: 1, perPage: 20 };

    it('parses a payload into exactly the declared fields', () => {
        const result = PaginationOffsetQuerySchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = PaginationOffsetQuerySchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces numeric strings into integers', () => {
        const result = PaginationOffsetQuerySchema.parse({
            page: '1',
            perPage: '20',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a non-integer page', () => {
        expect(() =>
            PaginationOffsetQuerySchema.parse({ page: 1.5 })
        ).toThrow();
    });

    it('rejects a non-integer perPage', () => {
        expect(() =>
            PaginationOffsetQuerySchema.parse({ perPage: 1.5 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PaginationOffsetQuerySchema.parse({ ...payload, cursor: 'x' })
        ).toThrow();
    });

    it('accepts search', () => {
        const result = PaginationOffsetQuerySchema.safeParse({
            search: 'jane',
        });

        expect(result.success).toBe(true);
    });

    it.each(['createdAt:desc', ['createdAt:desc', 'name:asc'], 1])(
        'rejects an orderBy of %s because a list DTO declares its own allow-list',
        orderBy => {
            const result = PaginationOffsetQuerySchema.safeParse({ orderBy });

            expect(result.success).toBe(false);
        }
    );

    it('trims a padded search', () => {
        const result = PaginationOffsetQuerySchema.parse({
            search: '  jane  ',
        });

        expect(result).toEqual({ search: 'jane' });
    });

    it('accepts a search of exactly the maximum length', () => {
        const search = 'a'.repeat(PaginationDefaultMaxSearchLength);

        const result = PaginationOffsetQuerySchema.safeParse({ search });

        expect(result.success).toBe(true);
    });

    it('rejects a search longer than the maximum length', () => {
        const search = 'a'.repeat(PaginationDefaultMaxSearchLength + 1);

        const result = PaginationOffsetQuerySchema.safeParse({ search });

        expect(result.success).toBe(false);
    });
});
