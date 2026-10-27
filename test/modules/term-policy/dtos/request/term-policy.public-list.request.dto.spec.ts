import { TermPolicyPublicListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';

describe('TermPolicyPublicListRequestSchema', () => {
    it('accepts cursor pagination, order, and type filters', () => {
        const input = {
            cursor: '507f1f77bcf86cd799439011',
            perPage: 20,
            orderBy: ['publishedAt:desc'],
            type: 'privacy',
        };

        expect(TermPolicyPublicListRequestSchema.parse(input)).toEqual(input);
    });

    it('rejects unknown query keys', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ unknown: true })
                .success
        ).toBe(false);
    });

    it.each([{ perPage: 0 }, { cursor: '' }])(
        'accepts integer and string boundary values without range constraints',
        input => {
            expect(
                TermPolicyPublicListRequestSchema.safeParse(input).success
            ).toBe(true);
        }
    );

    it('rejects a fractional page size', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ perPage: 1.5 })
                .success
        ).toBe(false);
    });
});
