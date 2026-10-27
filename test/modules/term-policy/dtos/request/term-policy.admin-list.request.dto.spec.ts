import { TermPolicyAdminListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';

describe('TermPolicyAdminListRequestSchema', () => {
    it('accepts offset pagination, order, type, and status filters', () => {
        const input = {
            page: 2,
            perPage: 20,
            orderBy: 'createdAt:desc',
            type: 'privacy',
            status: 'draft',
        };

        expect(TermPolicyAdminListRequestSchema.parse(input)).toEqual(input);
    });

    it('rejects unknown query keys', () => {
        expect(
            TermPolicyAdminListRequestSchema.safeParse({ unknown: true })
                .success
        ).toBe(false);
    });

    it.each([{ page: 0 }, { perPage: 0 }, { perPage: 101 }])(
        'accepts integer boundary values without range constraints',
        input => {
            expect(
                TermPolicyAdminListRequestSchema.safeParse(input).success
            ).toBe(true);
        }
    );

    it.each([{ page: 1.5 }, { perPage: 1.5 }])(
        'rejects fractional pagination values',
        input => {
            expect(
                TermPolicyAdminListRequestSchema.safeParse(input).success
            ).toBe(false);
        }
    );
});
