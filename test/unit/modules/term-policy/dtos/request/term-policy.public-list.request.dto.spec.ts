import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyPublicListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';

describe('TermPolicyPublicListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            cursor: 'eyJpZCI6IjEifQ',
            perPage: 20,
            orderBy: 'version:desc',
            type: 'privacy',
        };

        const result = TermPolicyPublicListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload with every field optional', () => {
        const result = TermPolicyPublicListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyPublicListRequestSchema.parse({ status: 'draft' })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            TermPolicyPublicListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(TermPolicyDefaultAvailableOrderBy.join(', '));
    });
});
