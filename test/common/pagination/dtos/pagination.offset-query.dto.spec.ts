import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

describe('PaginationOffsetQuerySchema', () => {
    it('coerces integer page inputs', () =>
        expect(
            PaginationOffsetQuerySchema.parse({ page: '1', perPage: '10' })
        ).toEqual({ page: 1, perPage: 10 }));
    it.each([{ page: '1.5' }, { perPage: '1.5' }, { page: 1, unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(PaginationOffsetQuerySchema.safeParse(input).success).toBe(
                false
            )
    );
});
