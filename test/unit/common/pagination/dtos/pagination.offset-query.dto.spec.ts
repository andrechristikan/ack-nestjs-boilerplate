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
        const result = PaginationOffsetQuerySchema.safeParse({ page: 1.5 });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['page'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a non-integer perPage', () => {
        const result = PaginationOffsetQuerySchema.safeParse({ perPage: 1.5 });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['perPage'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = PaginationOffsetQuerySchema.safeParse({
            ...payload,
            cursor: 'x',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
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

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    path: [],
                    code: 'unrecognized_keys',
                }),
            ]);
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

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['search'], code: 'too_big' }),
        ]);
    });
});
