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
});
