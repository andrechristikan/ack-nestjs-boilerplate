import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';

describe('PaginationCursorQuerySchema', () => {
    it('coerces an integer page size and accepts a cursor', () =>
        expect(
            PaginationCursorQuerySchema.parse({
                cursor: 'cursor',
                perPage: '10',
            })
        ).toEqual({ cursor: 'cursor', perPage: 10 }));
    it.each([{ perPage: '1.5' }, { cursor: 'cursor', unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(PaginationCursorQuerySchema.safeParse(input).success).toBe(
                false
            )
    );
});
