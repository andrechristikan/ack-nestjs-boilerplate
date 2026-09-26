import { TermPolicyAcceptedListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';

describe('TermPolicyAcceptedListRequestSchema', () => {
    it('accepts cursor pagination and repeated order fields', () => {
        const input = {
            cursor: '507f1f77bcf86cd799439011',
            perPage: 20,
            orderBy: ['acceptedAt:desc', 'createdAt:asc'],
        };

        expect(TermPolicyAcceptedListRequestSchema.parse(input)).toEqual(input);
    });

    it('rejects unknown query keys', () => {
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({ unknown: true })
                .success
        ).toBe(false);
    });

    it.each([{ perPage: 0 }, { cursor: '' }])(
        'accepts integer and string boundary values without range constraints',
        input => {
            expect(
                TermPolicyAcceptedListRequestSchema.safeParse(input).success
            ).toBe(true);
        }
    );

    it('rejects a fractional page size', () => {
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({ perPage: 1.5 })
                .success
        ).toBe(false);
    });
});
